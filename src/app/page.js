import Link from "next/link";
import { Footer, Navbar } from "@/components/Shell";

const conversation = [
  ["Agent", "Your cloud invoice is due. Should I handle payment for you?", "text-black"],
  ["User", "Yes. Use USDC on Sui and keep it within the purchase limit.", "text-x402"],
  ["Agent", "> POST /api/provision { merchant: 'Apple Inc', amount: 5.00 }", "text-gray-600"],
  ["Server", "HTTP 402 Payment Required: Sui USDC signature needed.", "text-x402-orange"],
  ["Agent", "Signing the challenge with the funded Sui account...", "text-x402"],
  ["Server", "HTTP 200 OK: Merchant-locked virtual card issued.", "text-x402-green"],
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      <main>
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-14 border-b-2 border-black px-6 py-16 md:py-24 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="inline-block border-2 border-black bg-black px-3 py-1 font-mono text-sm font-bold text-white brutal-shadow-sm">
              DEMO READY ON SUI TESTNET
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-bold leading-[0.98] tracking-tight md:text-6xl xl:text-7xl">
                Agent-triggered card provisioning.
              </h1>
              <p className="max-w-xl text-lg font-medium leading-8 text-gray-800 md:text-xl">
                Give your agent secure spending power without a card vault or fiat checkout. A user action becomes a Sui USDC x402 payment and a virtual card in one flow.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/demo"
                className="border-2 border-black bg-x402 px-8 py-4 text-center font-bold text-white brutal-shadow brutal-shadow-hover"
              >
                Open Demo
              </Link>
              <a
                href="https://docs.x402.org"
                target="_blank"
                className="border-2 border-black bg-white px-8 py-4 text-center font-bold brutal-shadow brutal-shadow-hover"
              >
                Read x402 Docs
              </a>
            </div>
          </div>

          <div className="flex min-h-[430px] flex-col justify-between overflow-hidden border-2 border-black bg-x402-code p-6 font-mono text-sm leading-6 brutal-shadow">
            <div>
              <div className="mb-5 flex items-center gap-2 border-b-2 border-black pb-4">
                <div className="h-3 w-3 rounded-full border border-black bg-red-500" />
                <div className="h-3 w-3 rounded-full border border-black bg-yellow-400" />
                <div className="h-3 w-3 rounded-full border border-black bg-green-500" />
                <div className="ml-3 text-xs font-bold uppercase tracking-widest text-gray-600">
                  Provisioning Loop
                </div>
              </div>
              <div className="space-y-2">
                {conversation.map(([sender, text, tone]) => (
                  <div key={`${sender}-${text}`} className={`flex min-w-0 gap-2 ${tone}`}>
                    <span className="shrink-0 self-start border border-current px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest">
                      {sender}
                    </span>
                    <span className="min-w-0 flex-1 break-words">{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase text-x402">
              <div className="h-2 w-2 animate-pulse rounded-full bg-x402" />
              Sui x402 facilitator connected
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 border-b-2 border-black px-6 py-16 md:grid-cols-3 md:py-24">
          {[
            ["01", "Sui Account", "The demo uses a funded Sui account to simulate the user-approved payment step while keeping the browser flow simple."],
            ["02", "x402 Settlement", "The protected route emits a Sui USDC HTTP 402 requirement and settles the signed payment through the facilitator."],
            ["03", "Card Issuance", "After settlement clears, Lithic creates a merchant-locked virtual card with the requested spend limit."],
          ].map(([number, title, copy]) => (
            <div key={number} className="space-y-4">
              <div className="font-mono text-3xl font-black text-x402">{number}</div>
              <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
              <p className="leading-7 text-gray-800">{copy}</p>
            </div>
          ))}
        </section>

        <section className="border-b-2 border-black bg-x402-subtle py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
            <div>
              <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
                App Router APIs, ready for Vercel.
              </h2>
              <p className="mb-8 text-lg leading-8 text-gray-800">
                The Express server has been replaced by Next route handlers, so the UI and payment APIs deploy as one Vercel project.
              </p>
              <ul className="space-y-4 font-mono text-sm font-medium text-gray-800">
                <li className="flex items-center gap-3"><span className="bg-black px-2 py-0.5 text-white">GET</span> /demo</li>
                <li className="flex items-center gap-3"><span className="bg-x402 px-2 py-0.5 text-white">POST</span> /api/demo/run-agent</li>
                <li className="flex items-center gap-3"><span className="bg-x402-orange px-2 py-0.5 text-white">POST</span> /api/provision</li>
              </ul>
            </div>
            <pre className="overflow-x-auto border-2 border-black bg-white p-6 font-mono text-sm leading-7 brutal-shadow">
{`const response = await fetch("/api/provision", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    merchant: "Apple Inc",
    amount: "5.00"
  })
});`}
            </pre>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
