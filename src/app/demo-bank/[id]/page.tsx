import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { paymentMode, shopName } from "@/lib/config";
import { getPayment } from "@/lib/payments";
import DemoBank from "./demo-bank";

// A PRETEND bank, only used when PAYMENT_MODE=demo.
// In TrueLayer mode this step happens on TrueLayer's page and the real bank's app.
export default function DemoBankPage({ params }: PageProps<"/demo-bank/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-center text-slate-500">Loading…</p>}>
      <DemoBankLoader params={params} />
    </Suspense>
  );
}

async function DemoBankLoader({ params }: Pick<PageProps<"/demo-bank/[id]">, "params">) {
  if (paymentMode() !== "demo") notFound();
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) notFound();
  if (payment.status !== "pending") redirect(`/pay/${id}/done`);

  return <DemoBank paymentId={payment.id} amountPence={payment.amountPence} note={payment.note} payee={shopName()} />;
}
