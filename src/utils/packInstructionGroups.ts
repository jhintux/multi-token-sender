import type { TransactionInstruction } from "@solana/web3.js";

export const V1_MAX_ACCOUNTS = 64;
export const V1_MAX_INSTRUCTIONS = 64;
export const V0_MAX_TRANSACTION_BYTES = 1232;
export const V1_MAX_TRANSACTION_BYTES = 4096;

export const collectAccountKeys = (instructions: TransactionInstruction[]) => {
  const keys = new Set<string>();

  for (const instruction of instructions) {
    keys.add(instruction.programId.toBase58());
    for (const account of instruction.keys) {
      keys.add(account.pubkey.toBase58());
    }
  }

  return keys;
};

export const packInstructionGroups = (
  groups: TransactionInstruction[][],
  limits: { maxAccounts: number; maxInstructions: number }
) => {
  const batches: TransactionInstruction[][] = [];
  let current: TransactionInstruction[] = [];

  for (const group of groups) {
    if (group.length === 0) continue;

    const combined = [...current, ...group];
    const exceedsLimits =
      combined.length > limits.maxInstructions ||
      collectAccountKeys(combined).size > limits.maxAccounts;

    if (current.length > 0 && exceedsLimits) {
      batches.push(current);
      current = [...group];

      if (
        current.length > limits.maxInstructions ||
        collectAccountKeys(current).size > limits.maxAccounts
      ) {
        throw new Error(
          "A single token transfer does not fit in one transaction."
        );
      }
    } else if (
      current.length === 0 &&
      (group.length > limits.maxInstructions ||
        collectAccountKeys(group).size > limits.maxAccounts)
    ) {
      throw new Error(
        "A single token transfer does not fit in one transaction."
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
