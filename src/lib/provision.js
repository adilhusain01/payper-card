import axios from "axios";
import { provisionedCards } from "./cards";

export function jsonError(message, status = 400, details) {
  return Response.json(
    details === undefined ? { error: message } : { error: message, details },
    { status },
  );
}

export function getPayToAddress() {
  return process.env.X402_PAY_TO_ADDRESS;
}

export async function parseProvisionRequest(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new Error("Request body must be valid JSON.");
  }

  const merchant = String(body?.merchant || "").trim();
  const amount = String(body?.amount || "").trim();

  if (!merchant || !amount) {
    throw new Error("Missing 'merchant' or 'amount' in request.");
  }

  return { merchant, amount, body };
}

export async function provisionLithicCard(merchant, amount) {
  if (!process.env.LITHIC_API_KEY) {
    throw new Error("Missing LITHIC_API_KEY for Lithic card provisioning.");
  }

  const lithicResponse = await axios.post(
    "https://sandbox.lithic.com/v1/cards",
    {
      type: "MERCHANT_LOCKED",
      spend_limit: Math.round(Number(amount) * 100),
      memo: merchant,
    },
    {
      headers: {
        Authorization: process.env.LITHIC_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  const card = lithicResponse.data;
  provisionedCards.push({
    token: card.token,
    merchant,
    amount,
    timestamp: new Date().toISOString(),
    card,
  });

  return card;
}
