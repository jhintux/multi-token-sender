import { NextResponse } from "next/server";
import { fetchWalletTokenAssets } from "@/utils/fetchWalletAssets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");

  if (!owner) {
    return NextResponse.json(
      { error: "Owner address is required" },
      { status: 400 }
    );
  }

  try {
    const items = await fetchWalletTokenAssets(owner);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}
