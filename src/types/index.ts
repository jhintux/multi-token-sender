export const TOKEN_2022_PROGRAM_ID =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export const FUNGIBLE_INTERFACES = new Set(["FungibleToken", "FungibleAsset"]);

export interface TokenAsset {
  id: string;
  associated_token_address: string;
  name: string;
  image?: string;
  amount: number;
  decimals: number;
  interface: string;
  amountToSend?: number;
  token_program: string;
  isToken2022: boolean;
}

export const isFungibleToken = (asset: TokenAsset) =>
  FUNGIBLE_INTERFACES.has(asset.interface);
