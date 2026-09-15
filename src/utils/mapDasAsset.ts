import {
  TOKEN_2022_PROGRAM_ID,
  type TokenAsset,
} from "@/types";
import type { DasAsset } from "@/utils/helius";

const toUiAmount = (balance: number | undefined, decimals: number) => {
  if (!balance) return 0;
  return balance / 10 ** decimals;
};

const getAssetName = (asset: DasAsset) =>
  asset.content?.metadata?.name?.trim() ||
  asset.token_info?.symbol ||
  asset.mint_extensions?.metadata?.name ||
  asset.mint_extensions?.metadata?.symbol ||
  "Unknown";

const getAssetImage = (asset: DasAsset) =>
  asset.content?.links?.image ||
  asset.content?.files?.[0]?.cdn_uri ||
  asset.content?.files?.[0]?.uri;

export const mapDasAsset = (asset: DasAsset): TokenAsset => {
  const decimals = asset.token_info?.decimals ?? 0;
  const amount = toUiAmount(asset.token_info?.balance, decimals);
  const tokenProgram = asset.token_info?.token_program ?? "";

  return {
    id: asset.id,
    name: getAssetName(asset),
    image: getAssetImage(asset),
    amount,
    decimals,
    interface: asset.interface,
    amountToSend: amount,
    associated_token_address: asset.token_info?.associated_token_address || "",
    token_program: tokenProgram,
    isToken2022: tokenProgram === TOKEN_2022_PROGRAM_ID,
  };
};
