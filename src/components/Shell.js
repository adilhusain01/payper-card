import Link from "next/link";

export function Navbar({ badge = "SUI X402" }) {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-black bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight transition-colors hover:text-x402"
        >
          PayPer<span className="text-x402">Card</span>
        </Link>
        <div className="flex min-w-0 items-center gap-4 text-sm font-bold">
          <Link href="/resources" className="hidden transition-colors hover:text-x402 md:block">
            Resources
          </Link>
          <a href="/SKILL.md" target="_blank" className="hidden transition-colors hover:text-x402 md:block">
            SKILL.md
          </a>
          <a href="https://docs.x402.org" target="_blank" className="hidden transition-colors hover:text-x402 lg:block">
            x402 Docs
          </a>
          <Link
            href="/demo"
            className="inline-flex h-10 min-w-24 items-center justify-center border-2 border-black bg-x402 px-4 font-bold text-white brutal-shadow-sm transition-colors hover:bg-white hover:text-black"
          >
            Open Demo
          </Link>
          <div className="hidden border-2 border-black bg-white px-3 py-1 font-mono text-xs text-black brutal-shadow-sm xl:block">
            {badge}
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t-2 border-black bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 md:flex-row">
        <div className="text-xl font-bold tracking-tight">
          PayPer<span className="text-x402">Card</span>
        </div>
        <div className="text-center font-mono text-sm text-gray-700 md:text-left">
          Built for agent-triggered payment flows on Sui USDC.
        </div>
        <div className="flex gap-5 text-sm font-bold">
          <a href="https://docs.sui.io" target="_blank" className="hover:text-x402">
            Sui Docs
          </a>
          <a href="https://developers.circle.com/stablecoins/quickstart-setup-transfer-usdc-sui" target="_blank" className="hover:text-x402">
            Circle
          </a>
        </div>
      </div>
    </footer>
  );
}
