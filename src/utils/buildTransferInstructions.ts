import {
  calculateEpochFee,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  createTransferCheckedWithFeeAndTransferHookInstruction,
  createTransferCheckedWithFeeInstruction,
  createTransferCheckedWithTransferHookInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getTransferFeeConfig,
  getTransferHook,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import type { TokenAsset } from "@/types";

export const toRawTokenAmount = (uiAmount: number, decimals: number) => {
  const [whole, fraction = ""] = uiAmount
    .toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: decimals,
    })
    .split(".");

  return BigInt(whole + fraction.padEnd(decimals, "0").slice(0, decimals));
};

const getOrCreateAtaInstruction = async (
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  tokenProgram: PublicKey
) => {
  const ata = getAssociatedTokenAddressSync(mint, owner, false, tokenProgram);

  try {
    await getAccount(connection, ata, "confirmed", tokenProgram);
    return { ata, createInstruction: null };
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError) {
      return {
        ata,
        createInstruction: createAssociatedTokenAccountInstruction(
          payer,
          ata,
          owner,
          mint,
          tokenProgram
        ),
      };
    }
    throw error;
  }
};

const buildCheckedTransferInstruction = async (
  connection: Connection,
  source: PublicKey,
  mint: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  rawAmount: bigint,
  decimals: number,
  tokenProgram: PublicKey,
  epoch: bigint,
  isToken2022: boolean
) => {
  if (!isToken2022) {
    return createTransferCheckedInstruction(
      source,
      mint,
      destination,
      owner,
      rawAmount,
      decimals,
      [],
      tokenProgram
    );
  }

  const mintAccount = await getMint(connection, mint, "confirmed", tokenProgram);
  const transferFeeConfig = getTransferFeeConfig(mintAccount);
  const transferHook = getTransferHook(mintAccount);
  const fee = transferFeeConfig
    ? calculateEpochFee(transferFeeConfig, epoch, rawAmount)
    : BigInt(0);

  if (transferHook && transferFeeConfig) {
    return createTransferCheckedWithFeeAndTransferHookInstruction(
      connection,
      source,
      mint,
      destination,
      owner,
      rawAmount,
      decimals,
      fee,
      [],
      "confirmed",
      tokenProgram
    );
  }

  if (transferHook) {
    return createTransferCheckedWithTransferHookInstruction(
      connection,
      source,
      mint,
      destination,
      owner,
      rawAmount,
      decimals,
      [],
      "confirmed",
      tokenProgram
    );
  }

  if (transferFeeConfig) {
    return createTransferCheckedWithFeeInstruction(
      source,
      mint,
      destination,
      owner,
      rawAmount,
      decimals,
      fee,
      [],
      tokenProgram
    );
  }

  return createTransferCheckedInstruction(
    source,
    mint,
    destination,
    owner,
    rawAmount,
    decimals,
    [],
    tokenProgram
  );
};

export type TransferInstructionGroup = TransactionInstruction[];

export const buildTransferInstructionGroups = async ({
  connection,
  owner,
  receiver,
  assets,
}: {
  connection: Connection;
  owner: PublicKey;
  receiver: PublicKey;
  assets: TokenAsset[];
}): Promise<TransferInstructionGroup[]> => {
  const groups: TransferInstructionGroup[] = [];
  const epoch = assets.some((asset) => asset.isToken2022)
    ? BigInt((await connection.getEpochInfo()).epoch)
    : BigInt(0);

  for (const asset of assets) {
    if (!asset.amountToSend || !asset.associated_token_address) continue;

    const mint = new PublicKey(asset.id);
    const tokenProgram = new PublicKey(asset.token_program);
    const source = new PublicKey(asset.associated_token_address);
    const { ata: destination, createInstruction } =
      await getOrCreateAtaInstruction(
        connection,
        owner,
        mint,
        receiver,
        tokenProgram
      );

    const rawAmount = toRawTokenAmount(asset.amountToSend, asset.decimals);
    if (rawAmount <= BigInt(0)) continue;

    const group: TransactionInstruction[] = [];
    if (createInstruction) {
      group.push(createInstruction);
    }

    group.push(
      await buildCheckedTransferInstruction(
        connection,
        source,
        mint,
        destination,
        owner,
        rawAmount,
        asset.decimals,
        tokenProgram,
        epoch,
        asset.isToken2022
      )
    );
    groups.push(group);
  }

  return groups;
};
