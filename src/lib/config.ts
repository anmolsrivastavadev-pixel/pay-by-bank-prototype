// Settings read from environment variables (.env.local).
// This file is only ever imported by server code, so it never reaches the browser.

export type PaymentMode = "demo" | "truelayer";

export function paymentMode(): PaymentMode {
  return process.env.PAYMENT_MODE === "truelayer" ? "truelayer" : "demo";
}

export function shopName(): string {
  return process.env.SHOP_NAME || "UKPI Demo Café";
}

/**
 * The address people use to reach this server, e.g. "http://192.168.0.47:3000".
 * Taken from APP_BASE_URL if you set it, otherwise from the request itself.
 */
export function baseUrlFrom(request: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

/** Reads a required setting, with a helpful message if it's missing. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing. Add it to .env.local and restart npm run dev.`);
  return value;
}
