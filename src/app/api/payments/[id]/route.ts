import { NextResponse } from "next/server";
import { getPayment, toPublic } from "@/lib/payments";
import { refreshPayment } from "@/lib/providers";

// GET /api/payments/:id
// The shop page calls this every 2 seconds to ask "has it been paid yet?"
export async function GET(_request: Request, { params }: RouteContext<"/api/payments/[id]">) {
  const { id } = await params;
  const found = await getPayment(id);
  if (!found) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  // In TrueLayer mode, check with TrueLayer in case a webhook hasn't arrived.
  const payment = await refreshPayment(found);

  return NextResponse.json(toPublic(payment), {
    headers: { "Cache-Control": "no-store" },
  });
}
