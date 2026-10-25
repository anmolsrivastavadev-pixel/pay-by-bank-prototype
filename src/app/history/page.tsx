import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { formatPence } from "@/lib/money";
import { listPayments, type PaymentStatus } from "@/lib/payments";

export default function HistoryPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment history</h1>
        <Link href="/shop" className="text-indigo-600 underline">
          Shop till
        </Link>
      </div>
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <PaymentList />
      </Suspense>
    </main>
  );
}

async function PaymentList() {
  // connection() tells Next.js: "work this out fresh on every visit,
  // don't save a copy at build time". History changes all the time.
  await connection();
  const payments = await listPayments();

  if (payments.length === 0) {
    return <p className="text-slate-500">No payments yet. Create one from the shop till.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {payments.map((p) => (
        <li key={p.id} className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{p.note}</p>
            <p className="text-sm text-slate-500">
              {p.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <StatusBadge status={p.status} />
          <p className="w-20 text-right font-semibold tabular-nums">{formatPence(p.amountPence)}</p>
        </li>
      ))}
    </ul>
  );
}

const BADGE: Record<PaymentStatus, string> = {
  created: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-800",
  succeeded: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
};

function StatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[status]}`}>{status}</span>;
}
