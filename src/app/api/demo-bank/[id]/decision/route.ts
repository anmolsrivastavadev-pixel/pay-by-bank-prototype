import { NextResponse } from "next/server";
import { paymentMode } from "@/lib/config";
import { advanceStatus, PaymentStatus } from "@/lib/payments";

// POST /api/demo-bank/:id/decision   body: { approve: true | false }
// DEMO MODE ONLY. This pretends to be the bank telling us
// "the customer approved (or declined) the payment".
// In TrueLayer mode, the real bank's answer arrives via the webhook instead.
export async function POST(request: Request, { params }: RouteContext<"/api/demo-bank/[id]/decision">) {
  if (paymentMode() !== "demo") {
    return NextResponse.json({ error: "The demo bank is switched off." }, { status: 404 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const to = body?.approve === true ? PaymentStatus.succeeded : PaymentStatus.failed;

  // pending -> succeeded/failed. Can't go backwards, can't change once finished.
  const updated = await advanceStatus(id, to);
  if (!updated) return NextResponse.json({ error: "This payment can’t be changed now." }, { status: 409 });

  return NextResponse.json({ redirectUrl: `/pay/${id}/done` });
}
