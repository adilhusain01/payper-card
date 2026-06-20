"use client";

import { Check, Copy, Eye, EyeOff, LockKeyhole, Nfc } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function groupPan(pan) {
  return String(pan || "").replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
}

function maskedPan(pan) {
  const digits = String(pan || "").replace(/\D/g, "");
  return `•••• •••• •••• ${digits.slice(-4).padStart(4, "•")}`;
}

export default function VirtualCard({ card, merchant, amount }) {
  const [isRevealed, setIsRevealed] = useState(true);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  async function copyPan() {
    try {
      await navigator.clipboard.writeText(card.pan);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const displayPan = isRevealed ? groupPan(card.pan) : maskedPan(card.pan);
  const expiry = `${card.exp_month}/${String(card.exp_year).slice(-2)}`;

  return (
    <section aria-labelledby="issued-card-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-normal text-x402-green">
            Provisioning complete
          </p>
          <h2 id="issued-card-title" className="mt-1 text-2xl font-bold tracking-normal">
            Issued virtual card
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRevealed((current) => !current)}
            aria-label={isRevealed ? "Hide card details" : "Reveal card details"}
            title={isRevealed ? "Hide card details" : "Reveal card details"}
            className="flex h-11 w-11 items-center justify-center border-2 border-black bg-white text-black brutal-shadow-sm brutal-shadow-hover"
          >
            {isRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button
            type="button"
            onClick={copyPan}
            aria-label="Copy card number"
            title="Copy card number"
            className="flex h-11 w-11 items-center justify-center border-2 border-black bg-white text-black brutal-shadow-sm brutal-shadow-hover"
          >
            {copied ? <Check size={18} className="text-x402-green" /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      <div
        className="relative aspect-[1.586/1] w-full max-w-[560px] overflow-hidden rounded-lg border-2 border-black bg-[#101114] text-white shadow-[6px_7px_0_0_#000]"
        style={{ containerType: "inline-size" }}
      >
        <div className="absolute -left-[15%] -top-[44%] h-[112%] w-[54%] rotate-[18deg] bg-[#2864ff]" />
        <div className="absolute -bottom-[38%] -right-[12%] h-[82%] w-[62%] -rotate-[14deg] bg-[#ff5a36]" />
        <div className="absolute right-[12%] top-0 h-[38%] w-[9%] -skew-x-[18deg] bg-[#f5d547]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_32%,rgba(255,255,255,0.04)_64%,transparent)]" />

        <div className="relative z-10 flex h-full flex-col justify-between p-[6.2cqi]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[5.6cqi] font-black leading-none tracking-normal">
                PayPer<span className="text-[#9bb7ff]">Card</span>
              </div>
              <div className="mt-[1.5cqi] font-mono text-[2.6cqi] font-bold uppercase tracking-normal text-white/70">
                Agent spend account
              </div>
            </div>
            <div className="border border-white/40 bg-black/40 px-[2.3cqi] py-[1.1cqi] font-mono text-[2.4cqi] font-bold uppercase tracking-normal backdrop-blur-sm">
              Virtual
            </div>
          </div>

          <div className="flex items-center gap-[3cqi]">
            <div className="relative h-[10cqi] w-[13cqi] overflow-hidden rounded-[1.2cqi] border border-[#6f5420] bg-[#d7aa43] shadow-inner">
              <div className="absolute inset-x-0 top-1/2 border-t border-[#806423]" />
              <div className="absolute inset-y-0 left-1/2 border-l border-[#806423]" />
              <div className="absolute left-0 top-[22%] w-full border-t border-[#806423]" />
              <div className="absolute bottom-[22%] left-0 w-full border-t border-[#806423]" />
            </div>
            <Nfc aria-label="Contactless enabled" className="h-[7cqi] w-[7cqi] rotate-90 text-white/90" strokeWidth={1.7} />
          </div>

          <div>
            <div className="whitespace-nowrap font-mono text-[5.2cqi] font-semibold leading-none tracking-normal text-white drop-shadow-sm">
              {displayPan}
            </div>
            <div className="mt-[4cqi] grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-[4cqi]">
              <div className="min-w-0">
                <div className="font-mono text-[2.2cqi] font-bold uppercase tracking-normal text-white/60">
                  Merchant lock
                </div>
                <div className="mt-[0.6cqi] truncate text-[3.5cqi] font-bold uppercase tracking-normal">
                  {merchant || card.memo || "Approved merchant"}
                </div>
              </div>
              <div>
                <div className="font-mono text-[2.2cqi] font-bold uppercase tracking-normal text-white/60">Exp</div>
                <div className="mt-[0.6cqi] font-mono text-[3.5cqi] font-bold">{expiry}</div>
              </div>
              <div>
                <div className="font-mono text-[2.2cqi] font-bold uppercase tracking-normal text-white/60">CVV</div>
                <div className="mt-[0.6cqi] font-mono text-[3.5cqi] font-bold">
                  {isRevealed ? card.cvv : "•••"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="flex min-w-0 items-center gap-[1.6cqi] font-mono text-[2.5cqi] font-bold uppercase tracking-normal text-white/80">
              <LockKeyhole className="h-[3.2cqi] w-[3.2cqi] shrink-0" />
              <span className="truncate">${amount} limit · USDC on Sui</span>
            </div>
            <div className="text-[7cqi] font-black italic leading-[0.75] tracking-normal">VISA</div>
          </div>
        </div>
      </div>

      <p className="max-w-[560px] text-xs leading-5 text-gray-600">
        Sandbox card details. Merchant-locked to {merchant} with a ${amount} transaction limit.
      </p>
    </section>
  );
}
