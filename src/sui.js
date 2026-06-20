const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { decodeSuiPrivateKey } = require('@mysten/sui/cryptography');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction } = require('@mysten/sui/transactions');
const { getExplorerURL } = require('x402-sui');

const SUI_USDC_COIN_TYPES = {
  mainnet: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  testnet: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
};

function getSuiNetwork() {
  const network = (process.env.SUI_NETWORK || 'testnet').toLowerCase();
  if (!['mainnet', 'testnet', 'devnet'].includes(network)) {
    throw new Error(`Unsupported SUI_NETWORK "${network}". Use mainnet, testnet, or devnet.`);
  }
  return network;
}

function getSuiRpcUrl(network = getSuiNetwork()) {
  return process.env.SUI_RPC_URL || getFullnodeUrl(network);
}

function getSuiClient(network = getSuiNetwork()) {
  return new SuiClient({ url: getSuiRpcUrl(network) });
}

function getSuiUsdcCoinType(network = getSuiNetwork()) {
  return process.env.SUI_USDC_COIN_TYPE || SUI_USDC_COIN_TYPES[network] || SUI_USDC_COIN_TYPES.testnet;
}

function parseUsdcUnits(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,6})?$/.test(raw)) {
    throw new Error('USDC amount must be a positive decimal with up to 6 fractional digits.');
  }

  const [whole, fraction = ''] = raw.split('.');
  const units = `${whole}${fraction.padEnd(6, '0')}`.replace(/^0+(?=\d)/, '');
  return BigInt(units || '0');
}

function formatUsdcUnits(units) {
  const value = BigInt(units);
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function loadSuiKeypair(secret = process.env.SUI_PRIVATE_KEY) {
  if (!secret) {
    throw new Error('Missing SUI_PRIVATE_KEY for Sui settlement.');
  }

  const trimmed = secret.trim();

  if (trimmed.startsWith('suiprivkey')) {
    const decoded = decodeSuiPrivateKey(trimmed);
    if (decoded.schema !== 'ED25519') {
      throw new Error(`Unsupported Sui key schema "${decoded.schema}". Use an Ed25519 Sui private key.`);
    }
    return Ed25519Keypair.fromSecretKey(decoded.secretKey);
  }

  if (/^(0x)?[0-9a-fA-F]+$/.test(trimmed)) {
    const hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
    return Ed25519Keypair.fromSecretKey(Buffer.from(hex, 'hex'));
  }

  return Ed25519Keypair.fromSecretKey(trimmed);
}

async function sendSuiUsdc({ recipient, amount, merchant }) {
  if (!recipient) {
    throw new Error('Missing X402_PAY_TO_ADDRESS for Sui settlement.');
  }

  const network = getSuiNetwork();
  const client = getSuiClient(network);
  const coinType = getSuiUsdcCoinType(network);
  const keypair = loadSuiKeypair();
  const sender = keypair.toSuiAddress();
  const amountInAtomicUnits = parseUsdcUnits(amount);

  if (amountInAtomicUnits <= 0n) {
    throw new Error('USDC amount must be greater than zero.');
  }

  const { data: coins } = await client.getCoins({ owner: sender, coinType });
  const total = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
  if (total < amountInAtomicUnits) {
    throw new Error(`Insufficient USDC on Sui. Need ${formatUsdcUnits(amountInAtomicUnits)}, found ${formatUsdcUnits(total)}.`);
  }

  const tx = new Transaction();
  tx.setSender(sender);

  const primaryCoin = coins[0];
  const primary = tx.object(primaryCoin.coinObjectId);

  if (coins.length > 1) {
    tx.mergeCoins(
      primary,
      coins.slice(1).map((coin) => tx.object(coin.coinObjectId)),
    );
  }

  if (total === amountInAtomicUnits) {
    tx.transferObjects([primary], recipient);
  } else {
    const [paymentCoin] = tx.splitCoins(primary, [amountInAtomicUnits]);
    tx.transferObjects([paymentCoin], recipient);
  }

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  await client.waitForTransaction({ digest: result.digest });

  console.log(`Demo settlement sent from ${sender} to ${recipient} for ${amount} USDC on Sui ${network} (${merchant}). Tx: ${result.digest}`);

  return {
    chain: 'sui',
    network,
    from: sender,
    to: recipient,
    amount,
    asset: coinType,
    txHash: result.digest,
    transactionLink: getExplorerURL(result.digest, network),
  };
}

module.exports = {
  SUI_USDC_COIN_TYPES,
  formatUsdcUnits,
  getSuiClient,
  getSuiNetwork,
  getSuiRpcUrl,
  getSuiUsdcCoinType,
  loadSuiKeypair,
  parseUsdcUnits,
  sendSuiUsdc,
};
