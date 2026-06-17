require('dotenv').config();
const {
  formatUsdcUnits,
  getSuiClient,
  getSuiNetwork,
  getSuiUsdcCoinType,
  loadSuiKeypair,
} = require('./sui');

async function showWalletInfo() {
  const network = getSuiNetwork();
  const client = getSuiClient(network);
  const keypair = loadSuiKeypair();
  const address = keypair.toSuiAddress();
  const usdcType = getSuiUsdcCoinType(network);

  const [suiBalance, usdcBalance] = await Promise.all([
    client.getBalance({ owner: address }),
    client.getBalance({ owner: address, coinType: usdcType }),
  ]);

  console.log(`Sui wallet: ${address}`);
  console.log(`Network: sui:${network}`);
  console.log(`SUI balance: ${Number(suiBalance.totalBalance) / 1_000_000_000}`);
  console.log(`USDC coin type: ${usdcType}`);
  console.log(`USDC balance: ${formatUsdcUnits(usdcBalance.totalBalance)}`);
}

showWalletInfo().catch((error) => {
  console.error('Failed to inspect Sui wallet:');
  console.error(error.message || error);
  process.exitCode = 1;
});
