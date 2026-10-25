import { NextResponse } from "next/server";
import { getPayment, toPublic } from "@/lib/payments";

// GET /api/payments/:id
// The shop page calls this every 2 seconds to ask "has it been paid yet?"
export async function GET(_request: Request, { params }: RouteContext<"/api/payments/[id]">) {
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  return NextResponse.json(toPublic(payment), {
    headers: { "Cache-Control": "no-store" },
  });
}
