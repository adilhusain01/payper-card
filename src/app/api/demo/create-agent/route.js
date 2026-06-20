import sui from "@/sui";

const { getSuiNetwork, getSuiUsdcCoinType } = sui;

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST() {
  return Response.json({
    success: true,
    agentId: `agent_${Date.now()}`,
    walletAddress: process.env.SUI_WALLET_ADDRESS,
    network: `sui:${getSuiNetwork()}`,
    asset: getSuiUsdcCoinType(),
    message: "Demo uses the provided funded Sui account; wallet creation is skipped.",
  });
}
