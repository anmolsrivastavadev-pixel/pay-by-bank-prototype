import { NextResponse } from "next/server";
import { getPaymentByProviderId } from "@/lib/payments";
import { syncFromTrueLayer, verifyTrueLayerWebhook } from "@/lib/providers/truelayer";

// POST /api/webhooks/truelayer
// TrueLayer calls this by itself whenever a payment changes, even if the
// shopper closed their phone. It's the most reliable way to hear "settled".
export async function POST(request: Request) {
  // Read the body as plain text: the signature covers the exact bytes,
  // so we must check it BEFORE turning it into an object.
  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  const valid = await verifyTrueLayerWebhook({
    signature: request.headers.get("tl-signature"),
    path: new URL(request.url).pathname,
    headers,
    body,
  });
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(body) as { type?: string; event_id?: string; payment_id?: string };
  console.log(`TrueLayer webhook ${event.type} for ${event.payment_id} (event ${event.event_id})`);

  if (event.payment_id) {
    const payment = await getPaymentByProviderId(event.payment_id);
    // Don't trust the event's own words either: ask TrueLayer directly.
    // If the same webhook arrives twice, the second sync finds nothing to
    // change, because a payment can't move to a status it's already in.
    if (payment) await syncFromTrueLayer(payment, { force: true });
  }

  // Always answer 200 once the signature is valid, or TrueLayer keeps retrying.
  return NextResponse.json({ ok: true });
}
