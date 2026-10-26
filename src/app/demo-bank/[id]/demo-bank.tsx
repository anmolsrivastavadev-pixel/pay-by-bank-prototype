"use client";

import { useState } from "react";
import { readResponse } from "@/lib/read-response";
import { formatPence } from "@/lib/money";

const BANKS = [
  { name: "Monzo", colour: "#ff4f40", letter: "M" },
  { name: "Barclays", colour: "#00aeef", letter: "B" },
  { name: "HSBC", colour: "#db0011", letter: "H" },
  { name: "NatWest", colour: "#42145f", letter: "N" },
] as const;

type Bank = (typeof BANKS)[number];

export default function DemoBank(props: { paymentId: string; amountPence: number; note: string; payee: string }) {
  const [bank, setBank] = useState<Bank | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      // Pretend to be the bank telling our server the answer.
      const res = await fetch(`/api/demo-bank/${props.paymentId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      });
      const data = await readResponse<{ redirectUrl: string }>(res);
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  const amount = formatPence(props.amountPence);

  // Step 1: choose your bank
  if (!bank) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-5">
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-center text-xs font-medium text-amber-900">
          DEMO MODE: no real money moves
        </p>
        <div>
          <h1 className="text-2xl font-bold">Choose your bank</h1>
          <p className="text-slate-600">
            to pay {amount} to {props.payee}
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {BANKS.map((b) => (
            <li key={b.name}>
              <button
                onClick={() => setBank(b)}
                className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left text-lg font-semibold shadow-sm ring-1 ring-slate-200 active:scale-[0.98]"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                  style={{ background: b.colour }}
                >
                  {b.letter}
                </span>
                {b.name}
                <span className="ml-auto text-slate-400">›</span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  // Step 2: "approve in your bank app"
  return (
    <main className="flex flex-1 flex-col">
      <header className="px-5 pb-10 pt-8 text-white" style={{ background: bank.colour }}>
        <p className="text-sm opacity-80">{bank.name} (pretend)</p>
        <h1 className="mt-1 text-2xl font-bold">Approve this payment?</h1>
      </header>
      <div className="mx-auto -mt-6 flex w-full max-w-md flex-1 flex-col gap-5 px-5 pb-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <Row label="To" value={props.payee} />
          <Row label="Amount" value={amount} big />
          <Row label="Reference" value={props.note} />
          <Row label="From" value={`${bank.name} current account ••4821`} />
        </div>
        {error && <p className="text-center text-rose-600">{error}</p>}
        <button
          onClick={() => decide(true)}
          disabled={busy}
          className="rounded-2xl px-5 py-4 text-lg font-semibold text-white disabled:opacity-60"
          style={{ background: bank.colour }}
        >
          {busy ? "Please wait…" : "Approve"}
        </button>
        <button
          onClick={() => decide(false)}
          disabled={busy}
          className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg font-semibold disabled:opacity-60"
        >
          Decline
        </button>
        <button onClick={() => setBank(null)} disabled={busy} className="text-sm text-slate-500 underline">
          Choose a different bank
        </button>
      </div>
    </main>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={big ? "text-2xl font-bold" : "text-right font-medium"}>{value}</span>
    </div>
  );
}
