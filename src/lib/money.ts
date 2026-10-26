// Money helpers. We never use decimals for money: 0.1 + 0.2 is
// 0.30000000000000004 in JavaScript, which is fine for games but not for bank
// balances. So everything is stored and calculated in whole pence.

export const MAX_PENCE = 100_000; // £1,000 limit for the prototype

/**
 * Turns what the shop typed ("3.50", "£3.5", "12") into pence (350, 350, 1200).
 * Works on the text itself instead of doing 3.50 * 100, so no rounding errors.
 * Returns null if the text isn't a valid amount.
 */
export function parsePoundsToPence(input: string): number | null {
  const cleaned = input.trim().replace(/^£/, "").replace(/,/g, "");
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;

  const pounds = Number(match[1]);
  const pence = Number((match[2] ?? "").padEnd(2, "0"));
  const total = pounds * 100 + pence;

  if (total <= 0 || total > MAX_PENCE) return null;
  return total;
}

/** 350 -> "£3.50". Only used for showing money to people. */
export function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}
