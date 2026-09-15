import { createHelius } from "helius-sdk";

const getHeliusClient = () => {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "";
  const apiKey = process.env.HELIUS_API_KEY || "";
  const network = rpcUrl.includes("devnet") ? "devnet" : "mainnet";

  if (!rpcUrl) {
    return createHelius({ apiKey, network });
  }

  const parsed = new URL(rpcUrl);
  const apiKeyFromUrl = parsed.searchParams.get("api-key") || apiKey;
  const baseUrl = `${parsed.origin}${parsed.pathname}`;

  return createHelius({
    apiKey: apiKeyFromUrl,
    network,
    baseUrl,
  });
};

export const helius = getHeliusClient();
