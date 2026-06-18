import {
  getPayToAddress,
  jsonError,
  parseProvisionRequest,
  provisionLithicCard,
} from "@/lib/provision";
import {
  createPaymentRequiredResponse,
  createPaymentRequirements,
  settleSuiPayment,
} from "@/lib/x402-sui";

export const runtime = "nodejs";

function paymentHeaders(paymentRequiredHeader, paymentResponseHeader) {
  const headers = {
    "Access-Control-Expose-Headers": "payment-required,payment-response",
  };

  if (paymentRequiredHeader) {
    headers["payment-required"] = paymentRequiredHeader;
  }

  if (paymentResponseHeader) {
    headers["payment-response"] = paymentResponseHeader;
  }

  return headers;
}

export async function POST(request) {
  let provisionRequest;
  try {
    provisionRequest = await parseProvisionRequest(request);
  } catch (error) {
    return jsonError(error.message, 400);
  }

  const { merchant, amount } = provisionRequest;
  const payTo = getPayToAddress();
  if (!payTo) {
    return jsonError("Missing X402_PAY_TO_ADDRESS or SUI_PAY_TO_ADDRESS for Sui x402 settlement.", 500);
  }

  let paymentRequirements;
  try {
    paymentRequirements = createPaymentRequirements({ merchant, amount, payTo });
  } catch (error) {
    return jsonError(error.message, 400);
  }

  const paymentRequired = createPaymentRequiredResponse({
    request,
    merchant,
    paymentRequirements,
  });

  const paymentSignature = request.headers.get("payment-signature");
  if (!paymentSignature) {
    return Response.json(paymentRequired.payload, {
      status: 402,
      headers: paymentHeaders(paymentRequired.header),
    });
  }

  const settlementResult = await settleSuiPayment(paymentSignature, paymentRequirements);
  if (!settlementResult.ok) {
    return Response.json(
      {
        ...settlementResult.body,
        accepts: paymentRequired.payload.accepts,
      },
      {
        status: settlementResult.status,
        headers: paymentHeaders(paymentRequired.header),
      },
    );
  }

  try {
    const card = await provisionLithicCard(merchant, amount);

    return Response.json(
      {
        success: true,
        message: "Payment successfully settled via Sui x402. Card provisioned.",
        settlement: settlementResult.settlement,
        card,
      },
      {
        headers: paymentHeaders(null, settlementResult.responseHeader),
      },
    );
  } catch (error) {
    return jsonError("Failed to provision card after Sui payment settlement.", 500, error.response?.data || error.message);
  }
}
