require('dotenv').config();
const { X402PaymentVerifier } = require('x402-sui');
const {
  formatUsdcUnits,
  getSuiClient,
  getSuiNetwork,
  getSuiUsdcCoinType,
  loadSuiKeypair,
  parseUsdcUnits,
} = require('./sui');

const MIN_SUI_FOR_GAS = 100_000_000n; // 0.1 SUI

function check(condition, ok, fail, warnings, errors) {
  if (condition) {
    console.log(`OK   ${ok}`);
    return;
  }
  console.log(`FAIL ${fail}`);
  errors.push(fail);
}

function warn(condition, message, warnings) {
  if (!condition) return;
  console.log(`WARN ${message}`);
  warnings.push(message);
}

function requiredEnv(name, errors) {
  const value = process.env[name];
  check(Boolean(value), `${name} is set`, `${name} is missing`, [], errors);
  return value;
}

async function checkFacilitator(url, warnings) {
  const mode = (process.env.X402_FACILITATOR_MODE || 'self').toLowerCase();
  if (mode === 'self') {
    console.log('OK   X402_FACILITATOR_MODE=self; server will verify and broadcast signed Sui transactions directly');
    return;
  }

  if (mode !== 'external') {
    warn(true, 'X402_FACILITATOR_MODE must be self or external. Falling back checks cannot prove x402 readiness.', warnings);
    return;
  }

  try {
    const verifier = new X402PaymentVerifier(url);
    const apiKey = process.env.X402_FACILITATOR_API_KEY || process.env.BLOCKEDEN_API_KEY;
    if (apiKey) {
      Object.assign(verifier.httpClient.defaults.headers.common, {
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      });
    }
    const supported = await verifier.getSupported();
    const kindCount = Array.isArray(supported?.kinds) ? supported.kinds.length : 0;
    if (kindCount > 0) {
      console.log(`OK   Facilitator reachable (${kindCount} supported payment kinds reported)`);
    } else {
      warn(true, 'External facilitator returned 0 supported payment kinds. Use X402_FACILITATOR_MODE=self or configure a Sui-capable facilitator/API key before running npm run agent.', warnings);
    }
  } catch (error) {
    warn(true, `External facilitator check failed: ${error.message || error}`, warnings);
  }
}

async function main() {
  const warnings = [];
  const errors = [];

  console.log('PayPer Card readiness check\n');

  const network = getSuiNetwork();
  const keypair = loadSuiKeypair();
  const walletAddress = keypair.toSuiAddress();
  const configuredWallet = process.env.SUI_WALLET_ADDRESS || process.env.FUNDED_WALLET_ADDRESS;
  const payTo = process.env.X402_PAY_TO_ADDRESS || process.env.SUI_PAY_TO_ADDRESS;
  const demoAmount = process.env.DEMO_AMOUNT || '1.00';
  const facilitatorUrl = process.env.X402_FACILITATOR_URL || 'https://x402.blockeden.xyz';
  const facilitatorMode = (process.env.X402_FACILITATOR_MODE || 'self').toLowerCase();

  requiredEnv('SUI_PRIVATE_KEY', errors);
  requiredEnv('LITHIC_API_KEY', errors);
  check(Boolean(payTo), 'Payment receiver address is set', 'X402_PAY_TO_ADDRESS or SUI_PAY_TO_ADDRESS is missing', warnings, errors);

  if (configuredWallet) {
    check(
      configuredWallet === walletAddress,
      'SUI_WALLET_ADDRESS matches SUI_PRIVATE_KEY',
      `SUI_WALLET_ADDRESS does not match derived address ${walletAddress}`,
      warnings,
      errors,
    );
  } else {
    warn(true, `SUI_WALLET_ADDRESS is empty; derived address is ${walletAddress}`, warnings);
  }

  warn(payTo === walletAddress, 'X402_PAY_TO_ADDRESS is the same as the payer wallet. This is OK for demos, but use a separate treasury/receiver address for a real x402 payment flow.', warnings);

  const client = getSuiClient(network);
  const usdcType = getSuiUsdcCoinType(network);
  const [suiBalance, usdcBalance] = await Promise.all([
    client.getBalance({ owner: walletAddress }),
    client.getBalance({ owner: walletAddress, coinType: usdcType }),
  ]);

  const suiTotal = BigInt(suiBalance.totalBalance);
  const usdcTotal = BigInt(usdcBalance.totalBalance);
  const requiredUsdc = parseUsdcUnits(demoAmount);

  console.log(`\nWallet: ${walletAddress}`);
  console.log(`Network: sui:${network}`);
  console.log(`x402 settlement mode: ${facilitatorMode}`);
  console.log(`SUI: ${Number(suiTotal) / 1_000_000_000}`);
  console.log(`USDC: ${formatUsdcUnits(usdcTotal)}`);
  console.log(`USDC coin type: ${usdcType}\n`);

  check(suiTotal >= MIN_SUI_FOR_GAS, 'SUI gas balance is enough for testnet demo', 'SUI balance is low; fund gas before running settlement', warnings, errors);
  check(usdcTotal >= requiredUsdc, `USDC balance covers DEMO_AMOUNT=${demoAmount}`, `USDC balance is below DEMO_AMOUNT=${demoAmount}`, warnings, errors);

  await checkFacilitator(facilitatorUrl, warnings);

  console.log('\nNext checks to run manually:');
  console.log('- npm run lint');
  console.log('- npm run build');
  console.log('- npm run agent  # spends DEMO_AMOUNT through the x402 path');
  console.log('- Open /demo and run a low amount such as 0.01 for the direct demo path');

  if (warnings.length > 0) {
    console.log(`\nWarnings: ${warnings.length}`);
  }

  if (errors.length > 0) {
    console.log(`\nReadiness failed with ${errors.length} error(s).`);
    process.exitCode = 1;
    return;
  }

  console.log('\nReady for local demo testing.');
}

main().catch((error) => {
  console.error('Readiness check failed:');
  console.error(error.message || error);
  process.exitCode = 1;
});
