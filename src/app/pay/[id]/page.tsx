import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import PaymentSummary from "@/components/payment-summary";
import { shopName } from "@/lib/config";
import { getPayment } from "@/lib/payments";
import PayButton from "./pay-button";

// What the shopper sees right after scanning the QR code.
// This is a SERVER component: it reads the database directly, then sends
// finished HTML to the phone. The phone never talks to the database.
export default function PayPage({ params }: PageProps<"/pay/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-5">
      <p className="text-center text-sm font-semibold uppercase tracking-wide text-indigo-600">UKPI · Pay by bank</p>
      <Suspense fallback={<p className="text-center text-slate-500">Loading payment…</p>}>
        <PaymentDetails params={params} />
      </Suspense>
    </main>
  );
}

async function PaymentDetails({ params }: Pick<PageProps<"/pay/[id]">, "params">) {
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) notFound();
  if (payment.status === "succeeded" || payment.status === "failed") redirect(`/pay/${id}/done`);

  return (
    <>
      <PaymentSummary shopName={shopName()} amountPence={payment.amountPence} note={payment.note} />
      <PayButton paymentId={payment.id} />
      <p className="text-center text-sm text-slate-500">
        🔒 You’ll approve this in your own bank. No card details needed.
      </p>
    </>
  );
}
