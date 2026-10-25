import type { Payment } from "@prisma/client";
import { paymentMode } from "../config";

// A "provider" is whoever actually asks the bank to move the money.
// Both modes answer the same question: "where should I send the shopper next?"
// The rest of the app doesn't care which one is switched on.

export async function startBankPayment(payment: Payment): Promise<{ redirectUrl: string }> {
  if (paymentMode() === "truelayer") {
    throw new Error("TrueLayer mode isn't built yet. Set PAYMENT_MODE=demo in .env.local.");
  }

  // Demo mode: send the shopper to our own pretend bank pages.
  return { redirectUrl: `/demo-bank/${payment.id}` };
}
