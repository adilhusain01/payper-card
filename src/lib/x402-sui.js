import { X402PaymentVerifier } from "x402-sui";
import { fromBase64, normalizeSuiAddress } from "@mysten/sui/utils";
import sui from "@/sui";

const { getSuiClient, getSuiNetwork, getSuiUsdcCoinType, parseUsdcUnits } = sui;

export function getFacilitatorUrl() {
  return process.env.X402_FACILITATOR_URL || "https://x402.blockeden.xyz";
}

export function getFacilitatorMode() {
  const mode = (process.env.X402_FACILITATOR_MODE || "self").toLowerCase();
  if (!["self", "external"].includes(mode)) {
    throw new Error('Unsupported X402_FACILITATOR_MODE. Use "self" or "external".');
  }
  return mode;
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

  if (getFacilitatorMode() === "self") {
    return settleSuiPaymentLocally(paymentPayload, paymentRequirements);
  }

  return settleSuiPaymentExternally(paymentPayload, paymentRequirements);
}

async function settleSuiPaymentExternally(paymentPayload, paymentRequirements) {
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

async function settleSuiPaymentLocally(paymentPayload, paymentRequirements) {
  const payload = paymentPayload.payload || {};
  if (!payload.transaction || !payload.signature) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_payload",
        message: "Missing signed Sui transaction in payment payload.",
      },
    };
  }

  const acceptedError = validateAcceptedPayment(paymentPayload.accepted, paymentRequirements);
  if (acceptedError) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_payment_requirements",
        message: acceptedError,
      },
    };
  }

  const client = getSuiClient(getSuiNetwork());
  let transactionBlock;
  try {
    transactionBlock = fromBase64(payload.transaction);
  } catch {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_payload",
        message: "Invalid base64 Sui transaction bytes.",
      },
    };
  }

  let dryRun;
  try {
    dryRun = await client.dryRunTransactionBlock({ transactionBlock });
  } catch (error) {
    return {
      ok: false,
      status: 402,
      body: {
        error: "invalid_transaction_state",
        message: error.message || "Sui dry run failed.",
      },
    };
  }

  if (dryRun.effects?.status?.status !== "success") {
    return {
      ok: false,
      status: 402,
      body: {
        error: "transaction_failed",
        message: dryRun.effects?.status?.error || "Sui dry run did not succeed.",
      },
    };
  }

  const payer = dryRun.input?.sender;
  const validationError = await validateDryRunPayment(client, dryRun, paymentRequirements, payer);
  if (validationError) {
    return {
      ok: false,
      status: 402,
      body: {
        error: validationError.error,
        message: validationError.message,
        payer,
      },
    };
  }

  try {
    const result = await client.executeTransactionBlock({
      transactionBlock,
      signature: payload.signature,
      options: {
        showBalanceChanges: true,
        showEffects: true,
        showInput: true,
      },
    });

    if (result.effects?.status?.status !== "success") {
      return {
        ok: false,
        status: 402,
        body: {
          error: "transaction_failed",
          message: result.effects?.status?.error || "Sui transaction execution failed.",
          payer,
          transaction: result.digest,
        },
      };
    }

    await client.waitForTransaction({ digest: result.digest });

    const settlement = {
      success: true,
      payer,
      transaction: result.digest,
      network: paymentRequirements.network,
      facilitator: "self",
    };

    return {
      ok: true,
      settlement,
      responseHeader: encodeBase64Json({
        success: true,
        payer,
        transaction: result.digest,
        network: paymentRequirements.network,
        facilitator: "self",
      }),
    };
  } catch (error) {
    return {
      ok: false,
      status: 402,
      body: {
        error: "broadcast_failed",
        message: error.message || "Failed to execute signed Sui transaction.",
        payer,
      },
    };
  }
}

function validateAcceptedPayment(accepted, expected) {
  if (!accepted) return "Payment payload is missing the accepted payment requirement.";

  const fields = ["scheme", "network", "amount", "asset", "payTo"];
  for (const field of fields) {
    if (String(accepted[field]) !== String(expected[field])) {
      return `Payment payload ${field} does not match the server requirement.`;
    }
  }

  return null;
}

async function validateDryRunPayment(client, dryRun, paymentRequirements, payer) {
  const payTo = normalizeAddress(paymentRequirements.payTo);
  const sender = normalizeAddress(payer);
  const asset = paymentRequirements.asset;
  const amount = BigInt(paymentRequirements.amount);

  const received = sumBalanceChanges(dryRun.balanceChanges, payTo, asset);
  if (received >= amount) return null;

  const shapeError = await validateExactTransferShape(client, dryRun.input?.transaction, paymentRequirements);
  if (!shapeError && sender === payTo) {
    return null;
  }

  if (shapeError) return shapeError;

  return {
    error: "amount_insufficient",
    message: `Signed transaction pays ${received.toString()} units to ${paymentRequirements.payTo}; required ${amount.toString()}.`,
  };
}

function sumBalanceChanges(balanceChanges = [], owner, coinType) {
  return balanceChanges.reduce((sum, change) => {
    const address = normalizeAddress(change.owner?.AddressOwner);
    if (address !== owner || change.coinType !== coinType) return sum;
    const amount = BigInt(change.amount);
    return amount > 0n ? sum + amount : sum;
  }, 0n);
}

async function validateExactTransferShape(client, transaction, paymentRequirements) {
  const commands = transaction?.transactions || [];
  const inputs = transaction?.inputs || [];
  const amount = BigInt(paymentRequirements.amount);
  const payTo = normalizeAddress(paymentRequirements.payTo);

  for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
    const split = commands[commandIndex]?.SplitCoins;
    if (!split) continue;

    const coinInput = resolveArgument(split[0], inputs);
    const amountInput = split[1]?.map((argument) => resolveArgument(argument, inputs)).find(Boolean);
    if (BigInt(amountInput?.value || 0) !== amount) continue;

    const coinTypeError = await validateCoinInputType(client, coinInput, paymentRequirements.asset);
    if (coinTypeError) return coinTypeError;

    const hasMatchingTransfer = commands.some((command) => {
      const transfer = command?.TransferObjects;
      if (!transfer) return false;
      const recipient = resolveArgument(transfer[1], inputs);
      if (normalizeAddress(recipient?.value) !== payTo) return false;

      return transfer[0]?.some((objectArgument) => {
        const nested = objectArgument?.NestedResult;
        return Array.isArray(nested) && nested[0] === commandIndex;
      });
    });

    if (hasMatchingTransfer) return null;
  }

  return {
    error: "recipient_mismatch",
    message: "Signed transaction does not transfer the required asset and amount to the payment receiver.",
  };
}

async function validateCoinInputType(client, coinInput, asset) {
  if (!coinInput?.objectId) {
    return {
      error: "invalid_transaction_state",
      message: "Signed transaction does not split from a concrete Sui coin object.",
    };
  }

  const object = await client.getObject({
    id: coinInput.objectId,
    options: { showType: true },
  });
  const expectedType = `0x2::coin::Coin<${asset}>`;
  if (object.data?.type !== expectedType) {
    return {
      error: "invalid_payment_requirements",
      message: `Signed transaction uses ${object.data?.type || "unknown object type"} instead of ${expectedType}.`,
    };
  }

  return null;
}

function resolveArgument(argument, inputs) {
  if (!argument) return null;
  if (argument.Input !== undefined) return inputs[argument.Input] || null;
  return argument;
}

function normalizeAddress(value) {
  if (!value) return "";
  try {
    return normalizeSuiAddress(value);
  } catch {
    return String(value).toLowerCase();
  }
}

function getFacilitatorAuthHeaders() {
  const apiKey = process.env.X402_FACILITATOR_API_KEY;
  if (!apiKey) return {};

  return {
    Authorization: `Bearer ${apiKey}`,
    "x-api-key": apiKey,
  };
}
