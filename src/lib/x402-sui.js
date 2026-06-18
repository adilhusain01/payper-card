import { X402PaymentVerifier } from "x402-sui";
import sui from "@/sui";

const { getSuiNetwork, getSuiUsdcCoinType, parseUsdcUnits } = sui;

export function getFacilitatorUrl() {
  return process.env.X402_FACILITATOR_URL || "https://x402.blockeden.xyz";
}

function encodeBase64Json(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function decodeBase64Json(value) {
  return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
}

export function createPaymentRequirements({ merchant, amount, payTo }) {
  const network = getSuiNetwork();
  const facilitatorUrl = getFacilitatorUrl();

  return {
    scheme: "exact",
    network: `sui:${network}`,
    amount: parseUsdcUnits(amount).toString(),
    asset: getSuiUsdcCoinType(network),
    payTo,
    maxTimeoutSeconds: Number(process.env.X402_MAX_TIMEOUT_SECONDS || 300),
    extra: {
      currency: "USDC",
      decimals: 6,
      facilitator: facilitatorUrl,
      merchant,
    },
  };
}

export function createPaymentRequiredResponse({ request, merchant, paymentRequirements }) {
  const payload = {
    x402Version: 2,
    resource: {
      url: request.url,
      description: `PayPer Card provisioning for ${merchant}`,
    },
    accepts: [paymentRequirements],
  };

  return {
    payload,
    header: encodeBase64Json(payload),
  };
}

export async function settleSuiPayment(paymentSignatureHeader, paymentRequirements) {
  let paymentPayload;
  try {
    paymentPayload = decodeBase64Json(paymentSignatureHeader);
  } catch {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_payload",
        message: "Invalid payment-signature header: failed to decode.",
      },
    };
  }

  if (paymentPayload.x402Version !== 2) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_x402_version",
        message: "Only x402 v2 is supported.",
      },
    };
  }

  const verifier = new X402PaymentVerifier(getFacilitatorUrl());
  const authHeaders = getFacilitatorAuthHeaders();
  if (Object.keys(authHeaders).length > 0) {
    Object.assign(verifier.httpClient.defaults.headers.common, authHeaders);
  }

  const settlement = await verifier.settle(paymentPayload, {
    paymentRequirements,
  });

  if (!settlement.success) {
    return {
      ok: false,
      status: 402,
      body: {
        error: settlement.errorReason || "unexpected_settle_error",
        payer: settlement.payer,
        transaction: settlement.transaction,
      },
      settlement,
    };
  }

  return {
    ok: true,
    settlement,
    responseHeader: encodeBase64Json({
      success: settlement.success,
      payer: settlement.payer,
      transaction: settlement.transaction,
      network: settlement.network,
    }),
  };
}

function getFacilitatorAuthHeaders() {
  const apiKey = process.env.X402_FACILITATOR_API_KEY || process.env.BLOCKEDEN_API_KEY;
  if (!apiKey) return {};

  return {
    Authorization: `Bearer ${apiKey}`,
    "x-api-key": apiKey,
  };
}
