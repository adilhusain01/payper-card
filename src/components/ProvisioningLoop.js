"use client";

import { useEffect, useState } from "react";

const conversation = [
  ["Agent", "Your cloud invoice is due. Should I handle payment for you?", "text-black"],
  ["User", "Yes. Use USDC on Sui and keep it within the purchase limit.", "text-x402"],
  ["Agent", "> POST /api/provision { merchant: 'Apple Inc', amount: 5.00 }", "text-gray-600"],
  ["Server", "HTTP 402 Payment Required: Sui USDC signature needed.", "text-x402-orange"],
  ["Agent", "Signing the challenge with the funded Sui account...", "text-x402"],
  ["Server", "HTTP 200 OK: Merchant-locked virtual card issued.", "text-x402-green"],
];

const REVEAL_DELAY_MS = 850;
const COMPLETE_PAUSE_MS = 2400;
const RESTART_DELAY_MS = 450;

export default function ProvisioningLoop() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return undefined;
    }

    let timer;
    let cancelled = false;

    function reveal(index) {
      if (cancelled) return;

      if (index <= conversation.length) {
        setVisibleCount(index);
        const delay = index === conversation.length ? COMPLETE_PAUSE_MS : REVEAL_DELAY_MS;
        timer = window.setTimeout(() => reveal(index + 1), delay);
        return;
      }

      setVisibleCount(0);
      timer = window.setTimeout(() => reveal(1), RESTART_DELAY_MS);
    }

    timer = window.setTimeout(() => reveal(1), RESTART_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
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
        <div className="space-y-2" aria-label="Provisioning flow simulation">
          {conversation.map(([sender, text, tone], index) => {
            const isVisible = index < visibleCount;

            return (
              <div
                key={`${sender}-${text}`}
                className={`flex min-w-0 gap-2 transition-all duration-300 motion-reduce:translate-y-0 motion-reduce:opacity-100 ${tone} ${
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                }`}
              >
                <span className="shrink-0 self-start border border-current px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest">
                  {sender}
                </span>
                <span className="min-w-0 flex-1 break-words">{text}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase text-x402">
        <div className="h-2 w-2 animate-pulse rounded-full bg-x402" />
        Sui x402 facilitator connected
      </div>
    </div>
  );
}
