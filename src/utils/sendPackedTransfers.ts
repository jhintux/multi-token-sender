import type { Adapter, StandardWalletAdapter } from "@solana/wallet-adapter-base";
import {
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  packInstructionGroups,
  V0_MAX_TRANSACTION_BYTES,
  V1_MAX_ACCOUNTS,
  V1_MAX_INSTRUCTIONS,
  V1_MAX_TRANSACTION_BYTES,
} from "@/utils/packInstructionGroups";

const LOADED_ACCOUNTS_PAGE_BYTES = 32 * 1024;
const COMPUTE_UNIT_LIMIT_MAX = 1_400_000;

const isStandardWalletAdapter = (
  adapter: Adapter
): adapter is StandardWalletAdapter =>
  "standard" in adapter && adapter.standard === true;

const walletSupportsV1 = (adapter: Adapter) =>
  adapter.supportedTransactionVersions?.has(1) === true;

const roundUpLoadedAccountsDataSize = (bytes: number) =>
  Math.ceil(bytes / LOADED_ACCOUNTS_PAGE_BYTES) * LOADED_ACCOUNTS_PAGE_BYTES +
  LOADED_ACCOUNTS_PAGE_BYTES;

const compileV0Transaction = (
  payer: PublicKey,
  blockhash: string,
  instructions: TransactionInstruction[]
) => {
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(message);
};

const packV0BySize = (
  groups: TransactionInstruction[][],
  payer: PublicKey,
  blockhash: string
) => {
  const batches: TransactionInstruction[][] = [];
  let current: TransactionInstruction[] = [];

  const fits = (instructions: TransactionInstruction[]) =>
    compileV0Transaction(payer, blockhash, instructions).serialize().length <=
    V0_MAX_TRANSACTION_BYTES;

  for (const group of groups) {
    if (group.length === 0) continue;

    const combined = [...current, ...group];
    if (current.length > 0 && !fits(combined)) {
      batches.push(current);
      current = [...group];
      if (!fits(current)) {
        throw new Error(
          "A single token transfer does not fit in one v0 transaction."
        );
      }
    } else if (current.length === 0 && !fits(group)) {
      throw new Error(
        "A single token transfer does not fit in one v0 transaction."
      );
    } else {
      current = combined;
    }
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
};

const signV1Bytes = async (
  adapter: StandardWalletAdapter,
  bytes: Uint8Array
) => {
  const account = adapter.wallet.accounts[0];
  if (!account) {
    throw new Error("Wallet is not connected.");
  }

  if (!(SolanaSignTransaction in adapter.wallet.features)) {
    throw new Error("Wallet cannot sign transactions.");
  }

  const feature = (
    adapter.wallet.features as SolanaSignTransactionFeature
  )[SolanaSignTransaction];

  const [output] = await feature.signTransaction({
    account,
    transaction: bytes,
  });

  if (!output) {
    throw new Error("Wallet did not return a signed transaction.");
  }

  return output.signedTransaction;
};

const buildUnsignedV1Bytes = async ({
  rpcEndpoint,
  payer,
  blockhash,
  lastValidBlockHeight,
  instructions,
}: {
  rpcEndpoint: string;
  payer: PublicKey;
  blockhash: string;
  lastValidBlockHeight: number;
  instructions: TransactionInstruction[];
}) => {
  const kit = await import("@solana/kit");
  const kitInstructions = instructions.map((instruction) => ({
    programAddress: kit.address(instruction.programId.toBase58()),
    accounts: instruction.keys.map((account) => ({
      address: kit.address(account.pubkey.toBase58()),
      role: account.isSigner
        ? account.isWritable
          ? kit.AccountRole.WRITABLE_SIGNER
          : kit.AccountRole.READONLY_SIGNER
        : account.isWritable
          ? kit.AccountRole.WRITABLE
          : kit.AccountRole.READONLY,
    })),
    data: new Uint8Array(instruction.data),
  }));

  const rpc = kit.createSolanaRpc(rpcEndpoint);
  const estimateResourceLimits = kit.estimateResourceLimitsFactory({ rpc });
  const estimateAndSetResourceLimits = kit.estimateAndSetResourceLimitsFactory(
    async (message, config) => {
      const limits = await estimateResourceLimits(message, config);
      return {
        computeUnitLimit: Math.min(
          COMPUTE_UNIT_LIMIT_MAX,
          Math.ceil(limits.computeUnitLimit * 1.1)
        ),
        loadedAccountsDataSizeLimit: roundUpLoadedAccountsDataSize(
          limits.loadedAccountsDataSizeLimit ?? 0
        ),
      };
    }
  );

  const lifetime = {
    blockhash: blockhash as Parameters<
      typeof kit.setTransactionMessageLifetimeUsingBlockhash
    >[0]["blockhash"],
    lastValidBlockHeight: BigInt(lastValidBlockHeight),
  };

  const message = kit.pipe(
    kit.createTransactionMessage({ version: 1 }),
    (tx) => kit.setTransactionMessageFeePayer(kit.address(payer.toBase58()), tx),
    (tx) => kit.setTransactionMessageLifetimeUsingBlockhash(lifetime, tx),
    (tx) => kit.appendTransactionMessageInstructions(kitInstructions, tx),
    kit.fillTransactionMessageProvisoryResourceLimits
  );

  const estimatedMessage = await estimateAndSetResourceLimits(message);
  const compiled = kit.compileTransaction(estimatedMessage);
  const bytes = new Uint8Array(kit.getTransactionEncoder().encode(compiled));

  if (bytes.byteLength > V1_MAX_TRANSACTION_BYTES) {
    throw new Error("Packed v1 transaction exceeds the 4096-byte limit.");
  }

  return bytes;
};

export const canSendV1Transfers = (adapter: Adapter | null | undefined) =>
  Boolean(
    adapter && isStandardWalletAdapter(adapter) && walletSupportsV1(adapter)
  );

export const sendPackedTransfers = async ({
  adapter,
  connection,
  payer,
  groups,
  signTransaction,
}: {
  adapter: Adapter | null | undefined;
  connection: Connection;
  payer: PublicKey;
  groups: TransactionInstruction[][];
  signTransaction?: (
    transaction: VersionedTransaction
  ) => Promise<VersionedTransaction>;
}) => {
  if (groups.length === 0) return [];

  const latestBlockhash = await connection.getLatestBlockhash();
  const signatures: string[] = [];

  const sendV0Batches = async () => {
    if (!signTransaction) {
      throw new Error("Wallet cannot sign transactions.");
    }

    const batches = packV0BySize(
      groups,
      payer,
      latestBlockhash.blockhash
    );

    for (const instructions of batches) {
      const transaction = compileV0Transaction(
        payer,
        latestBlockhash.blockhash,
        instructions
      );
      const signedTransaction = await signTransaction(transaction);
      signatures.push(
        await connection.sendRawTransaction(signedTransaction.serialize())
      );
    }
  };

  if (
    canSendV1Transfers(adapter) &&
    adapter &&
    isStandardWalletAdapter(adapter)
  ) {
    const batches = packInstructionGroups(groups, {
      maxAccounts: V1_MAX_ACCOUNTS,
      maxInstructions: V1_MAX_INSTRUCTIONS,
    });
    const firstBatch = batches[0];
    if (!firstBatch) {
      return signatures;
    }

    let firstUnsignedBytes: Uint8Array;
    try {
      firstUnsignedBytes = await buildUnsignedV1Bytes({
        rpcEndpoint: connection.rpcEndpoint,
        payer,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        instructions: firstBatch,
      });
    } catch {
      await sendV0Batches();
      return signatures;
    }

    for (const [index, instructions] of batches.entries()) {
      const unsignedBytes =
        index === 0
          ? firstUnsignedBytes
          : await buildUnsignedV1Bytes({
              rpcEndpoint: connection.rpcEndpoint,
              payer,
              blockhash: latestBlockhash.blockhash,
              lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
              instructions,
            });
      const signedBytes = await signV1Bytes(adapter, unsignedBytes);
      signatures.push(await connection.sendRawTransaction(signedBytes));
    }

    return signatures;
  }

  await sendV0Batches();
  return signatures;
};
