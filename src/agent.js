require('dotenv').config();
const axios = require('axios');
const {
  getPaymentResponseFromHeaders,
  keypairToAccount,
  wrapAxiosWithPayment,
} = require('x402-sui');
const { getSuiNetwork, loadSuiKeypair } = require('./sui');

const SERVER_URL = process.env.API_URL || 'http://localhost:3001';

async function requestVisaCard() {
  const keypair = loadSuiKeypair();
  const account = keypairToAccount(keypair, getSuiNetwork());

  const api = wrapAxiosWithPayment(
    axios.create({
      baseURL: SERVER_URL,
      headers: { 'Content-Type': 'application/json' },
    }),
    keypair,
    account,
  );

  console.log(`Agent Sui address: ${account.address}`);
  console.log(`Network: sui:${account.network}`);
  console.log(`Requesting virtual Visa card from ${SERVER_URL}/api/provision...`);
  console.log('The Sui x402 client will detect 402, sign a USDC payment, and retry.');

  try {
    const response = await api.post('/api/provision', {
      merchant: process.env.DEMO_MERCHANT || 'Apple Inc',
      amount: process.env.DEMO_AMOUNT || '5.00',
    });

    console.log('\nServer accepted the Sui x402 payment and provisioned the card.');
    console.log(response.data);

    const paymentResponse = getPaymentResponseFromHeaders(response);
    if (paymentResponse) {
      console.log('\nPayment settled receipt:', paymentResponse);
    }
  } catch (err) {
    console.error('\nRequest failed:');
    console.error(err.response?.data || err.message || err);
  }
}

requestVisaCard();
