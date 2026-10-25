import { NextResponse } from "next/server";
import { advanceStatus, getPayment, PaymentStatus } from "@/lib/payments";
import { baseUrlFrom } from "@/lib/config";
import { startBankPayment } from "@/lib/providers";

// POST /api/payments/:id/pay
// Called when the shopper taps "Pay by bank".
//
// Notice what the browser sends: NOTHING except the id in the URL.
// It never says how much to pay. The server looks the amount up in its own
// database, so a shopper can't edit the page and pay 1p instead of £3.50.
export async function POST(request: Request, { params }: RouteContext<"/api/payments/[id]/pay">) {
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  // Already finished? Just send them to the result page.
  if (payment.status === PaymentStatus.succeeded || payment.status === PaymentStatus.failed) {
    return NextResponse.json({ redirectUrl: `/pay/${id}/done` });
  }

  // created -> pending ("the shopper has started paying").
  // If it's already pending (they tapped twice) that's fine too.
  const updated = await advanceStatus(id, PaymentStatus.pending);
  if (!updated) return NextResponse.json({ error: "This payment can't be paid right now." }, { status: 409 });

  try {
    const { redirectUrl } = await startBankPayment(updated, baseUrlFrom(request));
    return NextResponse.json({ redirectUrl });
  } catch (err) {
    console.error(err);
    // While developing, show the real reason (e.g. a missing setting).
    const detail = process.env.NODE_ENV === "development" && err instanceof Error ? ` (${err.message})` : "";
    return NextResponse.json({ error: `Couldn't reach the bank. Please try again.${detail}` }, { status: 502 });
  }
}
