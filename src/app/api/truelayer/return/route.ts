import { NextResponse, type NextRequest } from "next/server";
import { baseUrlFrom } from "@/lib/config";
import { getPaymentByProviderId } from "@/lib/payments";
import { refreshPayment } from "@/lib/providers";

// GET /api/truelayer/return?payment_id=...
// TrueLayer's Hosted Payment Page sends the shopper back here when they're
// done. The address must be on the "redirect URI" allow list in TrueLayer Console.
//
// We never trust the URL to say "it worked": anyone could type that in.
// We only use it to find the payment, then ask TrueLayer for the real status.
export async function GET(request: NextRequest) {
  const base = baseUrlFrom(request);
  const tlPaymentId = request.nextUrl.searchParams.get("payment_id");
  const payment = tlPaymentId ? await getPaymentByProviderId(tlPaymentId) : null;
  if (!payment) return NextResponse.redirect(`${base}/`);

  // The shopper pressed "cancel" on TrueLayer's page: let them try again.
  if (request.nextUrl.searchParams.has("tl_hpp_abandoned") || request.nextUrl.searchParams.has("error")) {
    return NextResponse.redirect(`${base}/pay/${payment.id}`);
  }

  await refreshPayment(payment);
  return NextResponse.redirect(`${base}/pay/${payment.id}/done`);
}
