export interface DasAsset {
  id: string;
  interface: string;
  burnt?: boolean;
  content?: {
    metadata?: { name?: string };
    links?: { image?: string };
    files?: Array<{ cdn_uri?: string; uri?: string }>;
  };
  token_info?: {
    symbol?: string;
    decimals?: number;
    balance?: number;
    token_program?: string;
    associated_token_address?: string;
  };
  mint_extensions?: {
    metadata?: { name?: string; symbol?: string };
  };
}

export interface DasAssetList {
  items: DasAsset[];
  limit?: number;
}

const getRpcUrl = () => {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "";
  const apiKey = process.env.HELIUS_API_KEY || "";

  if (!rpcUrl) {
    return apiKey
      ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
      : "https://mainnet.helius-rpc.com/";
  }

  const parsed = new URL(rpcUrl);
  if (!parsed.searchParams.get("api-key") && apiKey) {
    parsed.searchParams.set("api-key", apiKey);
  }

  return parsed.toString();
};

const dasRpc = async <T>(method: string, params: unknown): Promise<T> => {
  const response = await fetch(getRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "multi-token-sender",
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status} (${method})`);
  }

  const json = (await response.json()) as {
    result?: T;
    error?: { message?: string };
  };

  if (json.error) {
    throw new Error(
      `RPC error (${method}): ${json.error.message ?? JSON.stringify(json.error)}`
    );
  }

  if (json.result === undefined) {
    throw new Error(`RPC error (${method}): missing result`);
  }

  return json.result;
};

export const helius = {
  getAssetsByOwner: (params: {
    ownerAddress: string;
    page: number;
    limit: number;
    displayOptions?: {
      showZeroBalance?: boolean;
      showUnverifiedCollections?: boolean;
      showFungible?: boolean;
    };
  }) => dasRpc<DasAssetList>("getAssetsByOwner", params),
  searchAssets: (params: {
    ownerAddress: string;
    tokenType: string;
    page: number;
    limit: number;
  }) => dasRpc<DasAssetList>("searchAssets", params),
};
