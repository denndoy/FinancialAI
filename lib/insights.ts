import type { TransactionType } from "@prisma/client";

export type TxLike = {
  amount: { toString(): string } | number | string;
  category: string | null;
  type: TransactionType;
  date: Date;
};

export type InsightResult = {
  lines: string[];
  topCategory: string | null;
  spendingChangePercent: number | null;
};

/**
 * Top spending category (expenses only) and month-over-month spending change.
 */
export function buildInsights(
  currentMonthExpenses: TxLike[],
  previousMonthExpenses: TxLike[]
): InsightResult {
  const lines: string[] = [];

  const byCat = new Map<string, number>();
  for (const t of currentMonthExpenses) {
    if (t.type !== "EXPENSE") continue;
    const amt = Number(t.amount.toString());
    const bucket = t.category?.trim() ? t.category : "Lainnya";
    byCat.set(bucket, (byCat.get(bucket) ?? 0) + amt);
  }

  let topCategory: string | null = null;
  let topAmount = 0;
  for (const [cat, sum] of Array.from(byCat.entries())) {
    if (sum > topAmount) {
      topAmount = sum;
      topCategory = cat;
    }
  }

  if (topCategory && topAmount > 0) {
    lines.push(`Pengeluaran terbesar bulan ini di kategori ${topCategory}.`);
  }

  const curTotal = currentMonthExpenses
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount.toString()), 0);
  const prevTotal = previousMonthExpenses
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount.toString()), 0);

  let spendingChangePercent: number | null = null;
  if (prevTotal > 0) {
    spendingChangePercent = Math.round(((curTotal - prevTotal) / prevTotal) * 100);
    if (spendingChangePercent > 0) {
      lines.push(`Pengeluaran naik ${spendingChangePercent}% dibanding bulan lalu.`);
    } else if (spendingChangePercent < 0) {
      lines.push(`Pengeluaran turun ${Math.abs(spendingChangePercent)}% dibanding bulan lalu.`);
    } else {
      lines.push("Pengeluaran stabil dibanding bulan lalu.");
    }
  } else if (curTotal > 0 && prevTotal === 0) {
    lines.push("Tidak ada pengeluaran tercatat di bulan sebelumnya untuk dibandingkan.");
  }

  if (lines.length === 0) {
    lines.push("Tambah transaksi untuk melihat wawasan yang lebih personal.");
  }

  return { lines, topCategory, spendingChangePercent };
}
