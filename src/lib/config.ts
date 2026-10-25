// Settings read from environment variables (.env.local).
// This file is only ever imported by server code, so it never reaches the browser.

export type PaymentMode = "demo" | "truelayer";

export function paymentMode(): PaymentMode {
  return process.env.PAYMENT_MODE === "truelayer" ? "truelayer" : "demo";
}

export function shopName(): string {
  return process.env.SHOP_NAME || "UKPI Demo Café";
}
