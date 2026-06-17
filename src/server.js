require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { X402PaymentVerifier, getPayment, tieredPayment } = require('x402-sui');
const {
  getSuiNetwork,
  getSuiUsdcCoinType,
  parseUsdcUnits,
  sendSuiUsdc,
} = require('./sui');

const app = express();
app.use(cors({
  exposedHeaders: ['payment-required', 'payment-response'],
}));
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/demo.html'));
});

app.get('/resources', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/resources.html'));
});

const provisionedCards = [];

function getFacilitatorAuthHeaders() {
  const apiKey = process.env.X402_FACILITATOR_API_KEY || process.env.BLOCKEDEN_API_KEY;
  if (!apiKey) return {};

  return {
    Authorization: `Bearer ${apiKey}`,
    'x-api-key': apiKey,
  };
}

function installFacilitatorAuthPatch() {
  const originalVerify = X402PaymentVerifier.prototype.verify;
  const originalSettle = X402PaymentVerifier.prototype.settle;

  function applyHeaders(verifier) {
    const headers = getFacilitatorAuthHeaders();
    if (Object.keys(headers).length === 0 || !verifier.httpClient) return;
    Object.assign(verifier.httpClient.defaults.headers.common, headers);
  }

  X402PaymentVerifier.prototype.verify = function patchedVerify(...args) {
    applyHeaders(this);
    return originalVerify.apply(this, args);
  };

  X402PaymentVerifier.prototype.settle = function patchedSettle(...args) {
    applyHeaders(this);
    return originalSettle.apply(this, args);
  };
}

installFacilitatorAuthPatch();

function validateProvisionRequest(req, res, next) {
  const { merchant, amount } = req.body;

  if (!merchant || !amount) {
    return res.status(400).json({ error: "Missing 'merchant' or 'amount' in request." });
  }

  try {
    const units = parseUsdcUnits(amount);
    if (units <= 0n) {
      return res.status(400).json({ error: "'amount' must be greater than zero." });
    }
    req.usdcAmountUnits = units;
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  return next();
}

function requireSuiPayment(req, res, next) {
  const payTo = process.env.X402_PAY_TO_ADDRESS || process.env.SUI_PAY_TO_ADDRESS;
  if (!payTo) {
    return res.status(500).json({
      error: 'Missing X402_PAY_TO_ADDRESS or SUI_PAY_TO_ADDRESS for Sui x402 settlement.',
    });
  }

  const network = getSuiNetwork();
  const asset = getSuiUsdcCoinType(network);
  const facilitatorUrl = process.env.X402_FACILITATOR_URL || 'https://x402.blockeden.xyz';

  const middleware = tieredPayment(
    (request) => ({
      amount: request.usdcAmountUnits.toString(),
      description: `PayPer Card provisioning for ${request.body.merchant}`,
    }),
    {
      amount: req.usdcAmountUnits.toString(),
      asset,
      payTo,
      network,
      facilitatorUrl,
      scheme: 'exact',
      maxTimeoutSeconds: Number(process.env.X402_MAX_TIMEOUT_SECONDS || 300),
      extra: {
        currency: 'USDC',
        decimals: 6,
        facilitator: facilitatorUrl,
      },
    },
  );

  return middleware(req, res, next);
}

async function provisionLithicCard(merchant, amount) {
  const lithicResponse = await axios.post(
    'https://sandbox.lithic.com/v1/cards',
    {
      type: 'MERCHANT_LOCKED',
      spend_limit: Math.round(Number(amount) * 100),
      memo: merchant,
    },
    {
      headers: {
        Authorization: process.env.LITHIC_API_KEY,
        'Content-Type': 'application/json',
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

async function settleDemoPayment(merchant, amount) {
  const payToAddress = process.env.X402_PAY_TO_ADDRESS || process.env.SUI_PAY_TO_ADDRESS;
  return sendSuiUsdc({
    recipient: payToAddress,
    amount,
    merchant,
  });
}

app.post('/api/demo/create-agent', (req, res) => {
  return res.status(200).json({
    success: true,
    agentId: `agent_${Date.now()}`,
    walletAddress: process.env.SUI_WALLET_ADDRESS || process.env.FUNDED_WALLET_ADDRESS,
    network: `sui:${getSuiNetwork()}`,
    asset: getSuiUsdcCoinType(),
    message: 'Demo uses the provided funded Sui account; wallet creation is skipped.',
  });
});

async function handleDemoRunAgent(req, res) {
  const { merchant, amount } = req.body;

  if (!merchant || !amount) {
    return res.status(400).json({ error: "Missing 'merchant' or 'amount' in request." });
  }

  console.log(`\nDemo provisioning for ${merchant} ($${amount}) using provided Sui funds...`);

  try {
    const settlement = await settleDemoPayment(merchant, amount);
    const card = await provisionLithicCard(merchant, amount);

    return res.status(200).json({
      success: true,
      message: 'Card provisioned successfully via Sui demo.',
      fundingSource: settlement.from,
      merchant,
      amount,
      settlement,
      card,
    });
  } catch (error) {
    console.error('Demo settlement error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to provision card',
      details: error.response?.data || error.message,
    });
  }
}

app.post('/api/demo/run-agent', handleDemoRunAgent);
app.post('/api/run-agent', handleDemoRunAgent);

app.get('/api/cards', (req, res) => {
  return res.status(200).json({
    success: true,
    cards: provisionedCards,
    count: provisionedCards.length,
  });
});

app.post('/api/provision', validateProvisionRequest, requireSuiPayment, async (req, res) => {
  const { merchant, amount } = req.body;
  const payment = getPayment(req);

  console.log(`\nSui x402 payment verified. Provisioning card for ${merchant} ($${amount})...`);

  try {
    const card = await provisionLithicCard(merchant, amount);
    console.log(`Virtual Visa generated via Lithic: ${card.token}`);

    return res.status(200).json({
      success: true,
      message: 'Payment successfully settled via Sui x402. Card provisioned.',
      settlement: payment || null,
      card,
    });
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to provision card after Sui payment settlement.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Sui x402 Protected Provider Server listening on port ${PORT}`);
  console.log(`Network: sui:${getSuiNetwork()}`);
  console.log(`USDC asset: ${getSuiUsdcCoinType()}`);
  console.log(`Facilitator: ${process.env.X402_FACILITATOR_URL || 'https://x402.blockeden.xyz'}`);
  console.log(`Home UI: http://localhost:${PORT}/`);
  console.log(`Demo UI: http://localhost:${PORT}/demo`);
  console.log('Waiting for Agent provisioning requests...');
});
