import { Footer, Navbar } from "@/components/Shell";

const docs = [
  {
    title: "System Instructions",
    path: "/SKILL.md",
    color: "bg-x402",
    copy: "Agent-facing instructions for provisioning cards through the Sui USDC flow.",
  },
  {
    title: "OpenAPI Specification",
    path: "/openapi.yaml",
    color: "bg-x402-orange",
    copy: "Machine-readable route schema for the Next API handlers.",
  },
  {
    title: "LLM API Notes",
    path: "/llms.txt",
    color: "bg-x402-green",
    copy: "Compact endpoint guidance for language-model integrations.",
  },
];

const links = [
  ["Open Demo", "/demo"],
  ["x402 Protocol Docs", "https://docs.x402.org"],
  ["Sui Developer Docs", "https://docs.sui.io"],
  ["Circle USDC on Sui", "https://developers.circle.com/stablecoins/quickstart-setup-transfer-usdc-sui"],
];

export const metadata = {
  title: "PayPer Card Resources",
};

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar badge="RESOURCES" />
      <main className="mx-auto max-w-6xl px-6 py-12 md:py-20">
        <section className="mb-12">
          <h1 className="mb-4 text-5xl font-bold tracking-tight md:text-6xl">
            Resources & Documentation
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-gray-800">
            Everything needed to deploy the Next.js Sui x402 app, call the APIs, and fund the demo wallet correctly.
          </p>
        </section>

        <section className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {docs.map((doc) => (
            <div key={doc.path} className="border-2 border-black bg-white p-7 brutal-shadow">
              <h2 className="mb-2 text-2xl font-bold">{doc.title}</h2>
              <p className="mb-6 min-h-16 leading-7 text-gray-800">{doc.copy}</p>
              <a
                href={doc.path}
                target="_blank"
                className={`inline-block border-2 border-black px-5 py-3 font-bold text-white brutal-shadow-sm ${doc.color}`}
              >
                Open
              </a>
            </div>
          ))}
        </section>

        <section className="mb-16 border-2 border-black bg-x402-subtle p-8">
          <h2 className="mb-6 text-3xl font-bold">Next.js App Structure</h2>
          <div className="space-y-3 font-mono text-sm">
            {[
              "src/app/page.js - SSR landing page",
              "src/app/demo/page.js - demo page shell",
              "src/components/DemoRunner.js - client-side demo controls",
              "src/app/api/provision/route.js - Sui x402 protected route",
              "src/app/api/demo/run-agent/route.js - direct Sui demo settlement",
              "src/app/api/cards/route.js - in-memory provisioned card listing",
              "src/sui.js - Sui wallet, USDC, and transaction helpers",
            ].map((line) => (
              <div key={line} className="flex gap-3">
                <span className="text-x402">-</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-2 border-black bg-white p-8 brutal-shadow">
          <h2 className="mb-6 text-3xl font-bold">Quick Links</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                className="border-2 border-black p-4 font-bold transition-colors hover:bg-black hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
