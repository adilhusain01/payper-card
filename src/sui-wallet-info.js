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
  const allBalances = await client.getAllBalances({ owner: address });

  console.log(`Sui wallet: ${address}`);
  console.log(`Network: sui:${network}`);
  console.log(`SUI balance: ${Number(suiBalance.totalBalance) / 1_000_000_000}`);
  console.log(`USDC coin type: ${usdcType}`);
  console.log(`USDC balance: ${formatUsdcUnits(usdcBalance.totalBalance)}`);

  const nonSuiBalances = allBalances.filter((coin) => coin.coinType !== '0x2::sui::SUI');
  if (nonSuiBalances.length > 0) {
    console.log('\nOther coin balances:');
    for (const coin of nonSuiBalances) {
      console.log(`- ${coin.coinType}: ${coin.totalBalance}`);
    }
  } else {
    console.log('\nOther coin balances: none');
  }

  if (BigInt(usdcBalance.totalBalance) === 0n) {
    console.log('\nUSDC is required for the card demo. Fund this address with Sui testnet USDC before running /api/demo/run-agent.');
  }
}

showWalletInfo().catch((error) => {
  console.error('Failed to inspect Sui wallet:');
  console.error(error.message || error);
  process.exitCode = 1;
});
