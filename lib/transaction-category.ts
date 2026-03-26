import type { TransactionType } from "@prisma/client";

/**
 * INCOME: no user category → empty string (works with NOT NULL DB columns).
 * EXPENSE: default "Other" when empty.
 */
export function categoryForDb(
  type: TransactionType,
  raw: string | null | undefined
): string {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (type === "INCOME") {
    return trimmed.length > 0 ? trimmed : "";
  }
  return trimmed.length > 0 ? trimmed : "Other";
}
