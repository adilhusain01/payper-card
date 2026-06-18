"use client";

import { useMemo, useState } from "react";

function nowTime() {
  return new Date().toISOString().split("T")[1].slice(0, 8);
}

function formatSettlement(settlement) {
  if (!settlement) return "N/A";
  return settlement.txHash || settlement.transaction || settlement.digest || "N/A";
}

function formatErrorPayload(data) {
  if (!data || typeof data !== "object") return "Unknown error";
  const detail = typeof data.details === "string" ? data.details : JSON.stringify(data.details);
  return detail ? `${data.error}: ${detail}` : data.error || JSON.stringify(data);
}

export default function DemoRunner() {
  const [merchant, setMerchant] = useState("Hetzner Cloud");
  const [amount, setAmount] = useState("1.00");
  const [logs, setLogs] = useState([
    { id: 1, text: "agentpay $ Waiting for a user action...", tone: "text-white" },
    {
      id: 2,
      text: "Demo loaded: using the provided Sui account for settlement.",
      tone: "text-green-400",
      time: nowTime(),
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [card, setCard] = useState(null);

  const runLabel = useMemo(() => (isRunning ? "Processing..." : card ? "Provisioned" : "Run Provisioning Flow"), [card, isRunning]);

  function appendLog(text, tone = "text-gray-300") {
    setLogs((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        text,
        tone,
        time: nowTime(),
      },
    ]);
  }

  async function runDemo() {
    setIsRunning(true);
    setCard(null);
    appendLog(`POST /api/demo/run-agent (Merchant: ${merchant}, Amount: $${amount})`, "text-white");
    appendLog("Agent is preparing a Sui USDC settlement request...", "text-yellow-300");

    try {
      const response = await fetch("/api/demo/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant, amount }),
      });
      const data = await response.json();

      if (!response.ok || !data.card) {
        appendLog(`Execution Failed: ${formatErrorPayload(data)}`, "text-red-400");
        return;
      }

      setCard(data.card);
      appendLog("Sui USDC settlement complete.", "text-green-400");
      appendLog(`HTTP 200 OK. Sui tx: ${formatSettlement(data.settlement)}`, "text-green-400");
      appendLog("Virtual card provisioning complete.", "text-green-400");
      appendLog("Card details returned to the demo view.", "text-blue-200");
    } catch (error) {
      appendLog(`Network Error: ${error.message}`, "text-red-400");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
      <section className="space-y-8">
        <div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Provision a Card Live
          </h1>
          <p className="max-w-xl text-base font-medium leading-7 text-gray-800">
            The demo sends USDC on Sui from the configured server-side account, then provisions a Lithic virtual card for the requested merchant and spend limit.
          </p>
        </div>

        <div className="border-2 border-black bg-white p-6 brutal-shadow">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-black bg-x402 text-sm font-black text-white">
              1
            </div>
            <h2 className="text-xl font-bold">Provided Sui Account</h2>
          </div>
          <p className="mb-4 text-sm text-gray-700">
            Wallet creation and funding are skipped in the visual demo. The app uses the Sui key configured in Vercel or your local `.env`.
          </p>
          <div className="border-2 border-black bg-x402-code p-3 font-mono text-xs">
            <span className="font-bold text-x402-green">Ready</span>
            <br />
            Run `npm run wallet:info` locally to confirm SUI gas and USDC balance.
          </div>
        </div>

        <div className="border-2 border-black bg-white p-6 brutal-shadow">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-black bg-x402-orange text-sm font-black text-white">
              2
            </div>
            <h2 className="text-xl font-bold">Agent Negotiates Purchase</h2>
          </div>
          <p className="mb-4 text-sm text-gray-700">
            Pick a merchant and USDC amount. The API route performs Sui settlement and card creation server-side.
          </p>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                Merchant
              </span>
              <input
                value={merchant}
                onChange={(event) => setMerchant(event.target.value)}
                className="w-full border-2 border-black bg-white p-2 font-mono text-sm outline-none focus:bg-x402-code"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                Amount (USDC)
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full border-2 border-black bg-white p-2 font-mono text-sm outline-none focus:bg-x402-code"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={runDemo}
            disabled={isRunning || !merchant || !amount}
            className="flex w-full items-center justify-center gap-2 border-2 border-black bg-x402 px-4 py-3 font-bold text-white brutal-shadow brutal-shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? <span className="loader" /> : null}
            <span>{runLabel}</span>
          </button>

          {card ? (
            <div className="mt-4 border-2 border-black bg-x402-code p-3 font-mono text-xs">
              <span className="text-[10px] font-bold uppercase tracking-widest text-x402">
                PAN Revealed
              </span>
              <div className="mt-1 inline-block border border-black bg-white p-1 text-base font-bold text-black">
                {card.pan}
              </div>
              <div className="mt-2">
                CVV: {card.cvv} | EXP: {card.exp_month}/{card.exp_year}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="sticky top-24 flex h-[620px] min-w-0 flex-col border-2 border-black bg-black font-mono text-sm text-white brutal-shadow">
        <div className="flex items-center gap-2 border-b-2 border-white bg-x402-code p-3 text-black">
          <div className="h-3 w-3 rounded-full border border-black bg-red-500" />
          <div className="h-3 w-3 rounded-full border border-black bg-yellow-400" />
          <div className="h-3 w-3 rounded-full border border-black bg-green-500" />
          <div className="ml-2 text-xs font-bold uppercase tracking-widest">
            provisioning_logs.sh
          </div>
        </div>
        <div className="terminal-scrollbar flex-1 space-y-2 overflow-y-auto p-4">
          {logs.map((log) => (
            <div key={log.id} className={`${log.tone} break-words`}>
              {log.time ? <span className="text-gray-500">[{log.time}] </span> : null}
              <span>{log.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
