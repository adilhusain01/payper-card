# PayPer Card - System Instructions for AI Agents

You can provision Lithic virtual cards through the PayPer Card local API after a Sui USDC payment clears.

The production-style route uses an x402 HTTP 402 loop on Sui. The demo route uses the configured funded Sui keypair server-side so a human can see the card provisioning flow without connecting a browser wallet.

## Quick Reference

```bash
# Demo route: settles from the configured Sui keypair, then provisions a card
curl -X POST http://localhost:3000/api/demo/run-agent \
  -H "Content-Type: application/json" \
  -d '{"merchant": "Hetzner Cloud", "amount": "15.00"}'

# Programmatic route: requires Sui x402 payment-signature retry flow
curl -X POST http://localhost:3000/api/provision \
  -H "Content-Type: application/json" \
  -d '{"merchant": "Hetzner Cloud", "amount": "15.00"}'

# List cards created during this server process
curl http://localhost:3000/api/cards
```

## Typical Flow

1. Calculate the purchase amount and merchant name.
2. Use a Sui x402 client for `POST /api/provision`, or use `POST /api/demo/run-agent` for the visual demo path.
3. Extract `pan`, `cvv`, `exp_month`, and `exp_year` from the response if a Lithic card is created.
4. Report failures with the route used, amount, merchant, Sui network, returned error body, and any transaction digest.

## Sui Payment Details

- Default network: `sui:testnet`.
- Default testnet USDC coin type: `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`.
- Mainnet USDC coin type: `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`.
- Required server env: `SUI_PRIVATE_KEY`, `X402_PAY_TO_ADDRESS`, `LITHIC_API_KEY`.
- Optional env: `SUI_NETWORK`, `SUI_RPC_URL`, `SUI_USDC_COIN_TYPE`, `X402_FACILITATOR_MODE`, `X402_FACILITATOR_URL`.

Do not persist raw card details in long-running memory unless the user explicitly asks for them.
