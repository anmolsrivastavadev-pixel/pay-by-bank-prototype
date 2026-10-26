"use client";

// "use client" means this component runs in the BROWSER, not on the server.
// We need that here because it reacts to typing, clicking and a timer.

import { useEffect, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import { formatPence } from "@/lib/money";
import type { PublicPayment } from "@/lib/payments";
import { readResponse } from "@/lib/read-response";

type Screen =
  | { kind: "form" }
  | { kind: "waiting"; payment: PublicPayment; qrDataUrl: string; payUrl: string }
  | { kind: "paid"; payment: PublicPayment }
  | { kind: "failed"; payment: PublicPayment };

export default function ShopTill({ shopName }: { shopName: string }) {
  const [screen, setScreen] = useState<Screen>({ kind: "form" });
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const onLocalhost = useSyncExternalStore(noSubscribe, isLocalhost, () => false);

  async function createQr(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // 1. Ask OUR server to save a new payment request in the database.
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note }),
      });
      const payment = await readResponse<PublicPayment>(res);

      // 2. Turn the shopper's link into a QR code picture.
      //    The QR only contains a link with the payment id, never the amount.
      const payUrl = `${window.location.origin}/pay/${payment.id}`;
      const qrDataUrl = await QRCode.toDataURL(payUrl, { width: 640, margin: 1 });

      setScreen({ kind: "waiting", payment, qrDataUrl, payUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // 3. While we're waiting, ask the server "is it paid yet?" every 2 seconds.
  //    This is called "polling".
  const waitingId = screen.kind === "waiting" ? screen.payment.id : null;
  useEffect(() => {
    if (!waitingId) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/payments/${waitingId}`, { cache: "no-store" });
      if (!res.ok) return;
      const payment = (await res.json()) as PublicPayment;
      if (payment.status === "succeeded") setScreen({ kind: "paid", payment });
      if (payment.status === "failed") setScreen({ kind: "failed", payment });
      if (payment.status === "pending") {
        setScreen((s) => (s.kind === "waiting" ? { ...s, payment } : s));
      }
    }, 2000);
    return () => clearInterval(timer); // stop the timer when we leave this screen
  }, [waitingId]);

  function reset() {
    setAmount("");
    setNote("");
    setScreen({ kind: "form" });
  }

  if (screen.kind === "paid") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-emerald-500 p-6 text-center text-white">
        <div className="text-[7rem] leading-none">✅</div>
        <h1 className="text-6xl font-extrabold">Paid</h1>
        <p className="text-3xl font-semibold">
          {formatPence(screen.payment.amountPence)} · {screen.payment.note}
        </p>
        <button onClick={reset} className="mt-6 rounded-2xl bg-white px-8 py-4 text-lg font-semibold text-emerald-700">
          New payment
        </button>
      </main>
    );
  }

  if (screen.kind === "failed") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-rose-500 p-6 text-center text-white">
        <div className="text-[7rem] leading-none">✖️</div>
        <h1 className="text-5xl font-extrabold">Payment failed</h1>
        <p className="text-2xl">The shopper’s bank didn’t approve it.</p>
        <button onClick={reset} className="mt-6 rounded-2xl bg-white px-8 py-4 text-lg font-semibold text-rose-700">
          Try again
        </button>
      </main>
    );
  }

  if (screen.kind === "waiting") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
        <p className="text-lg text-slate-500">{shopName}</p>
        <p className="text-5xl font-bold">{formatPence(screen.payment.amountPence)}</p>
        <p className="text-xl text-slate-600">{screen.payment.note}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screen.qrDataUrl}
          alt="QR code to pay"
          className="w-full max-w-sm rounded-3xl border-8 border-white shadow-lg"
        />
        <p className="flex items-center gap-2 text-lg font-medium text-slate-700">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-400" />
          {screen.payment.status === "pending"
            ? "Shopper is approving in their bank…"
            : "Scan to pay. Waiting for payment…"}
        </p>
        <a href={screen.payUrl} target="_blank" className="text-sm text-indigo-600 underline">
          No phone handy? Open the shopper page in a new tab
        </a>
        <button onClick={reset} className="text-sm text-slate-500 underline">
          Cancel
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Shop till</p>
        <h1 className="mt-1 text-3xl font-bold">{shopName}</h1>
      </div>

      {onLocalhost && (
        <p className="rounded-xl bg-amber-100 p-4 text-sm text-amber-900">
          You opened this page as <b>localhost</b>, so a phone can’t reach the QR link. Open it using your
          laptop’s Wi-Fi address instead (it’s printed as <b>Network</b> when you run <code>npm run dev</code>).
        </p>
      )}

      <form onSubmit={createQr} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Amount</span>
          <div className="flex items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-indigo-500">
            <span className="text-2xl text-slate-500">£</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="3.50"
              className="w-full bg-transparent p-3 text-2xl outline-none"
              required
            />
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={60}
            placeholder="Latte"
            className="rounded-xl border border-slate-300 bg-white p-3 text-lg outline-none focus:border-indigo-500"
            required
          />
        </label>
        {error && <p className="text-rose-600">{error}</p>}
        <button
          disabled={busy}
          className="rounded-2xl bg-indigo-600 px-5 py-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create QR"}
        </button>
      </form>
    </main>
  );
}

// Is this page open as "localhost"? A phone can't follow a localhost link,
// because on the phone "localhost" means the phone itself.
function isLocalhost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function noSubscribe() {
  return () => {};
}
