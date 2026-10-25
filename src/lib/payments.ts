import { PaymentStatus, type Payment } from "@prisma/client";
import { db } from "./db";

export { PaymentStatus };
export type { Payment };

// Which statuses each status is allowed to come FROM.
// This table is the whole "a payment only moves forward" rule.
const ALLOWED_FROM: Record<PaymentStatus, PaymentStatus[]> = {
  created: [],
  pending: [PaymentStatus.created],
  succeeded: [PaymentStatus.pending],
  failed: [PaymentStatus.pending],
};

export function createPayment(amountPence: number, note: string) {
  return db.payment.create({ data: { amountPence, note } });
}

export function getPayment(id: string) {
  return db.payment.findUnique({ where: { id } });
}

export function listPayments() {
  return db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

/**
 * Moves a payment to a new status, but only if that's a step forward.
 *
 * The check and the update happen in ONE database statement
 * ("update it, but only if its status is still X"). So if two requests race,
 * or the same webhook arrives twice, only one of them can win.
 *
 * Returns the payment afterwards, or null if the move wasn't allowed.
 */
export async function advanceStatus(
  id: string,
  to: PaymentStatus,
  extra: { providerPaymentId?: string } = {},
): Promise<Payment | null> {
  const { count } = await db.payment.updateMany({
    where: { id, status: { in: ALLOWED_FROM[to] } },
    data: { status: to, ...extra },
  });

  const payment = await getPayment(id);
  if (!payment) return null;

  // count === 0 means nothing changed. That's fine if it was ALREADY in the
  // target status (a repeat request): we just report success again.
  if (count === 0 && payment.status !== to) return null;
  return payment;
}

/** The fields that are safe to send to a browser. */
export function toPublic(payment: Payment) {
  return {
    id: payment.id,
    amountPence: payment.amountPence,
    currency: payment.currency,
    note: payment.note,
    status: payment.status,
    createdAt: payment.createdAt.toISOString(),
  };
}

export type PublicPayment = ReturnType<typeof toPublic>;
