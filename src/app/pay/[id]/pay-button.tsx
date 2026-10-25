"use client";

import { useState } from "react";

export default function PayButton({ paymentId }: { paymentId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      // We only send the payment id. The server already knows the amount.
      const res = await fetch(`/api/payments/${paymentId}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      // The server tells us where to go next: the (demo or real) bank.
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={pay}
        disabled={busy}
        className="rounded-2xl bg-indigo-600 px-5 py-5 text-xl font-semibold text-white shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Connecting to your bank…" : "Pay by bank"}
      </button>
      {error && <p className="text-center text-rose-600">{error}</p>}
    </div>
  );
}
