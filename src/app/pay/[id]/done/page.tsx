import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import AutoRefresh from "@/components/auto-refresh";
import { formatPence } from "@/lib/money";
import { shopName } from "@/lib/config";
import { getPayment } from "@/lib/payments";

// The result page the shopper lands on after their bank.
export default function DonePage({ params }: PageProps<"/pay/[id]/done">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <Suspense fallback={<p className="text-slate-500">Checking your payment…</p>}>
        <Result params={params} />
      </Suspense>
    </main>
  );
}

async function Result({ params }: Pick<PageProps<"/pay/[id]/done">, "params">) {
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) notFound();
  const amount = formatPence(payment.amountPence);

  if (payment.status === "succeeded") {
    return (
      <>
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-5xl">✅</div>
        <h1 className="text-3xl font-bold">Payment successful</h1>
        <p className="text-lg text-slate-600">
          You paid <b>{amount}</b> to {shopName()} for {payment.note}.
        </p>
        <p className="text-sm text-slate-500">The money went straight from your bank to the shop.</p>
      </>
    );
  }

  if (payment.status === "failed") {
    return (
      <>
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rose-100 text-5xl">✖️</div>
        <h1 className="text-3xl font-bold">Payment failed</h1>
        <p className="text-lg text-slate-600">No money left your account. Ask the shop for a new QR code.</p>
      </>
    );
  }

  // Still waiting for the bank. Check again every 2 seconds.
  return (
    <>
      <AutoRefresh />
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      <h1 className="text-2xl font-bold">Waiting for your bank…</h1>
      <p className="text-slate-600">{amount} to {shopName()}</p>
      {payment.status === "created" && (
        <Link href={`/pay/${id}`} className="text-indigo-600 underline">
          Back to payment
        </Link>
      )}
    </>
  );
}
