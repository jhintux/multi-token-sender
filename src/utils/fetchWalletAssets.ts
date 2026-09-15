import type { Asset, GetAssetResponseList } from "helius-sdk/types/das";
import type { TokenAsset } from "@/types";
import { helius } from "@/utils/helius";
import { mapDasAsset } from "@/utils/mapDasAsset";

const PAGE_LIMIT = 1000;
const MAX_PAGES = 20;

const fetchAllPages = async (
  fetchPage: (page: number) => Promise<GetAssetResponseList>
): Promise<Asset[]> => {
  const items: Asset[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetchPage(page);
    items.push(...response.items);
    if (response.items.length < (response.limit || PAGE_LIMIT)) break;
  }

  return items;
};

export const fetchWalletTokenAssets = async (
  ownerAddress: string
): Promise<TokenAsset[]> => {
  const [owned, fungibles] = await Promise.all([
    fetchAllPages((page) =>
      helius.getAssetsByOwner({
        ownerAddress,
        page,
        limit: PAGE_LIMIT,
        displayOptions: {
          showZeroBalance: false,
          showUnverifiedCollections: false,
          showFungible: true,
        },
      })
    ),
    fetchAllPages((page) =>
      helius.searchAssets({
        ownerAddress,
        tokenType: "fungible",
        page,
        limit: PAGE_LIMIT,
      })
    ),
  ]);

  const byId = new Map<string, Asset>();
  for (const asset of owned) {
    byId.set(asset.id, asset);
  }
  for (const asset of fungibles) {
    const existing = byId.get(asset.id);
    byId.set(asset.id, existing ? { ...existing, ...asset } : asset);
  }

  return [...byId.values()]
    .filter((asset) => !asset.burnt)
    .map(mapDasAsset);
};
