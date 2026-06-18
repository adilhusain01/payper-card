import sui from "@/sui";
import {
  getPayToAddress,
  jsonError,
  parseProvisionRequest,
  provisionLithicCard,
} from "@/lib/provision";

const { sendSuiUsdc } = sui;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  let provisionRequest;
  try {
    provisionRequest = await parseProvisionRequest(request);
  } catch (error) {
    return jsonError(error.message, 400);
  }

  const { merchant, amount } = provisionRequest;
  const payToAddress = getPayToAddress();
  if (!payToAddress) {
    return jsonError("Missing X402_PAY_TO_ADDRESS or SUI_PAY_TO_ADDRESS for Sui settlement.", 500);
  }

  try {
    const settlement = await sendSuiUsdc({
      recipient: payToAddress,
      amount,
      merchant,
    });
    const card = await provisionLithicCard(merchant, amount);

    return Response.json({
      success: true,
      message: "Card provisioned successfully via Sui demo.",
      fundingSource: settlement.from,
      merchant,
      amount,
      settlement,
      card,
    });
  } catch (error) {
    return jsonError(
      "Failed to provision card",
      500,
      error.response?.data || error.message,
    );
  }
}
