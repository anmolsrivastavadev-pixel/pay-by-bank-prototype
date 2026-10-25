import type { Payment } from "@/generated/prisma/client";
import { paymentMode } from "../config";
import { startTrueLayerPayment, syncFromTrueLayer } from "./truelayer";

// A "provider" is whoever actually asks the bank to move the money.
// Both modes answer the same questions, so the rest of the app doesn't care
// which one is switched on.

/** "Where should I send the shopper next?" */
export async function startBankPayment(payment: Payment, baseUrl: string): Promise<{ redirectUrl: string }> {
  if (paymentMode() === "truelayer") return startTrueLayerPayment(payment, baseUrl);

  // Demo mode: send the shopper to our own pretend bank pages.
  return { redirectUrl: `/demo-bank/${payment.id}` };
}

/**
 * "Has anything happened to this payment?" In TrueLayer mode we ask TrueLayer.
 * In demo mode our own database is already the truth.
 * Never throws: if TrueLayer is unreachable we just show what we have.
 */
export async function refreshPayment(payment: Payment): Promise<Payment> {
  if (paymentMode() !== "truelayer") return payment;
  try {
    return await syncFromTrueLayer(payment);
  } catch (err) {
    console.error(err);
    return payment;
  }
}
