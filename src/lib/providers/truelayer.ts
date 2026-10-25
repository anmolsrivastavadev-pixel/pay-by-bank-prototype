import { randomUUID } from "node:crypto";
import * as tlSigning from "truelayer-signing";
import type { Payment } from "@/generated/prisma/client";
import { requireEnv } from "../config";
import { advanceStatus, PaymentStatus, setProviderPaymentId } from "../payments";

// Everything that talks to TrueLayer lives in this one file.
// TrueLayer is a licensed company that is allowed to ask banks to move money
// (a "payment initiation service provider"). We ask TrueLayer, TrueLayer asks
// the shopper's bank, and the money lands in our TrueLayer merchant account.
//
// These are the SANDBOX (pretend money) addresses. The *_URL overrides exist
// only so the code can be tested against a fake TrueLayer.
const AUTH_URL = process.env.TRUELAYER_AUTH_URL ?? "https://auth.truelayer-sandbox.com";
const API_URL = process.env.TRUELAYER_API_URL ?? "https://api.truelayer-sandbox.com";
const HPP_URL = process.env.TRUELAYER_HPP_URL ?? "https://payment.truelayer-sandbox.com";

// Webhooks are only trusted if they're signed by a key from one of these.
const ALLOWED_JKUS = [
  "https://webhooks.truelayer-sandbox.com/.well-known/jwks",
  "https://webhooks.truelayer.com/.well-known/jwks",
  ...(process.env.TRUELAYER_EXTRA_JKU ? [process.env.TRUELAYER_EXTRA_JKU] : []),
];

// ---------------------------------------------------------------------------
// 1. Access token: proves to TrueLayer that this server is our app.
//    It lasts an hour, so we keep it in memory and reuse it.
// ---------------------------------------------------------------------------
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch(`${AUTH_URL}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: requireEnv("TRUELAYER_CLIENT_ID"),
      client_secret: requireEnv("TRUELAYER_CLIENT_SECRET"),
      scope: "payments",
    }),
  });
  if (!res.ok) throw new Error(`TrueLayer token request failed (${res.status}): ${await res.text()}`);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

// The private key can be pasted into .env.local either on several lines
// (inside quotes) or on one line with \n in it. Both end up the same.
function privateKeyPem(): string {
  return requireEnv("TRUELAYER_SIGNING_PRIVATE_KEY").replace(/\\n/g, "\n");
}

// ---------------------------------------------------------------------------
// 2. Create the payment at TrueLayer, then send the shopper to TrueLayer's
//    Hosted Payment Page, where they pick their bank and approve.
// ---------------------------------------------------------------------------
type CreatedPayment = { id: string; resource_token: string; status: string };

export async function startTrueLayerPayment(payment: Payment, baseUrl: string): Promise<{ redirectUrl: string }> {
  const path = "/v3/payments";
  const body = JSON.stringify({
    amount_in_minor: payment.amountPence, // TrueLayer also counts in pence
    currency: payment.currency,
    payment_method: {
      type: "bank_transfer",
      // Let the shopper choose their bank on TrueLayer's page.
      provider_selection: { type: "user_selected", filter: { countries: ["GB"] } },
      // Pay into OUR TrueLayer merchant account.
      beneficiary: {
        type: "merchant_account",
        merchant_account_id: requireEnv("TRUELAYER_MERCHANT_ACCOUNT_ID"),
      },
    },
    // TrueLayer must know who is paying (name + email or phone).
    // We have no login yet, so the prototype uses a pretend shopper.
    user: { name: "UKPI Demo Shopper", email: "shopper@example.com" },
    metadata: { ukpi_payment_id: payment.id },
  });

  // A random id for this request. If the network hiccups and we send it
  // again, TrueLayer sees the same key and won't create a second payment.
  const idempotencyKey = randomUUID();

  // Sign the request with our private key, so TrueLayer knows it really came
  // from us and nobody changed it on the way (e.g. the amount).
  const signature = tlSigning.sign({
    kid: requireEnv("TRUELAYER_SIGNING_KEY_ID"),
    privateKeyPem: privateKeyPem(),
    method: "POST" as tlSigning.HttpMethod,
    path,
    headers: { "Idempotency-Key": idempotencyKey },
    body,
  });

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "Tl-Signature": signature,
    },
    body,
  });
  if (!res.ok) throw new Error(`TrueLayer create payment failed (${res.status}): ${await res.text()}`);

  const created = (await res.json()) as CreatedPayment;
  if (!(await setProviderPaymentId(payment.id, created.id))) {
    throw new Error("Payment is no longer waiting to be paid.");
  }

  // The Hosted Payment Page takes its settings after a "#", not a "?".
  const returnUri = `${baseUrl}/api/truelayer/return`;
  const hash = new URLSearchParams({
    payment_id: created.id,
    resource_token: created.resource_token,
    return_uri: returnUri,
  });
  return { redirectUrl: `${HPP_URL}/payments#${hash}` };
}

// ---------------------------------------------------------------------------
// 3. Ask TrueLayer "what's the status of this payment?" and copy the answer
//    into our database. Used by the return page, the webhook and polling.
// ---------------------------------------------------------------------------

// TrueLayer has more statuses than we do. For a merchant account payment
// only "settled" (money arrived) and "failed" are final.
function toOurStatus(tlStatus: string): PaymentStatus | null {
  switch (tlStatus) {
    case "settled":
      return PaymentStatus.succeeded;
    case "failed":
      return PaymentStatus.failed;
    case "authorization_required":
    case "authorizing":
    case "authorized":
    case "executed":
      return PaymentStatus.pending;
    default:
      return null; // a status we don't know about yet: change nothing
  }
}

const lastChecked = new Map<string, number>();

export async function syncFromTrueLayer(payment: Payment, opts: { force?: boolean } = {}): Promise<Payment> {
  if (!payment.providerPaymentId || payment.status !== PaymentStatus.pending) return payment;

  // Don't ask TrueLayer more than once every 3 seconds per payment.
  const last = lastChecked.get(payment.id) ?? 0;
  if (!opts.force && Date.now() - last < 3000) return payment;
  lastChecked.set(payment.id, Date.now());

  // Reading a payment (GET) only needs the access token, no signature.
  const res = await fetch(`${API_URL}/v3/payments/${payment.providerPaymentId}`, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`TrueLayer get payment failed (${res.status}): ${await res.text()}`);

  const { status } = (await res.json()) as { status: string };
  const ours = toOurStatus(status);
  if (!ours || ours === payment.status) return payment;

  return (await advanceStatus(payment.id, ours)) ?? payment;
}

// ---------------------------------------------------------------------------
// 4. Check that a webhook really came from TrueLayer.
//    Anyone on the internet could POST to our webhook address pretending
//    "payment settled!", so we check TrueLayer's digital signature first.
// ---------------------------------------------------------------------------
const jwksCache = new Map<string, string>();

export async function verifyTrueLayerWebhook(args: {
  signature: string | null;
  path: string;
  headers: Record<string, string>;
  body: string;
}): Promise<boolean> {
  if (!args.signature) return false;
  try {
    // The signature says which public key list (JWKS) it was made with...
    const jku = tlSigning.extractJku(args.signature);
    // ...but we only trust TrueLayer's own addresses.
    if (!jku || !ALLOWED_JKUS.includes(jku)) return false;

    let jwks = jwksCache.get(jku);
    if (!jwks) {
      const res = await fetch(jku);
      if (!res.ok) return false;
      jwks = await res.text();
      jwksCache.set(jku, jwks);
    }

    // Throws if the body, path or headers don't match the signature.
    tlSigning.verify({
      jwks,
      signature: args.signature,
      method: "POST" as tlSigning.HttpMethod,
      path: args.path,
      headers: args.headers,
      body: args.body,
    });
    return true;
  } catch (err) {
    console.warn("Rejected TrueLayer webhook:", err instanceof Error ? err.message : err);
    return false;
  }
}
