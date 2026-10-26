import { NextResponse } from "next/server";
import { parsePoundsToPence } from "@/lib/money";
import { createPayment, toPublic } from "@/lib/payments";

// POST /api/payments
// Called by the SHOP page. Creates a new payment request in the database.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const amountText = typeof body?.amount === "string" ? body.amount : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 60) : "";

  const amountPence = parsePoundsToPence(amountText);
  if (amountPence === null) {
    return NextResponse.json({ error: "Enter an amount between £0.01 and £1,000." }, { status: 400 });
  }
  if (!note) {
    return NextResponse.json({ error: "Add a short note, like “Latte”." }, { status: 400 });
  }

  const payment = await createPayment(amountPence, note);
  return NextResponse.json(toPublic(payment), { status: 201 });
}
