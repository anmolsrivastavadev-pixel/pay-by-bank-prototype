import { formatPence } from "@/lib/money";

// The "who / how much / what for" box shown to the shopper.
export default function PaymentSummary({
  shopName,
  amountPence,
  note,
}: {
  shopName: string;
  amountPence: number;
  note: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl">☕</div>
      <p className="text-slate-500">Paying</p>
      <p className="text-xl font-semibold">{shopName}</p>
      <p className="mt-4 text-5xl font-bold">{formatPence(amountPence)}</p>
      <p className="mt-2 text-slate-600">{note}</p>
    </div>
  );
}
