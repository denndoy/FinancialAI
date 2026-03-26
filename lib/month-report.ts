import type { Transaction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildInsights } from "@/lib/insights";

export function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

/** `month` query or null → normalized `YYYY-MM` for current month if invalid. */
export function resolveMonthQuery(monthParam: string | null): string {
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) return monthParam;
  return fallback;
}

export type MonthlyDashboardData = {
  month: string;
  summary: { income: number; expenses: number; balance: number };
  pie: { name: string; value: number }[];
  insights: string[];
  transactions: Transaction[];
};

export async function getMonthlyDashboardData(
  userId: string,
  month: string
): Promise<MonthlyDashboardData> {
  const { start: curStart, end: curEnd } = monthBounds(month);
  const prevDate = new Date(curStart);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const { start: prevStart, end: prevEnd } = monthBounds(prevYm);

  const [current, previous] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: curStart, lte: curEnd },
      },
      orderBy: { date: "desc" },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: prevStart, lte: prevEnd },
      },
    }),
  ]);

  let income = 0;
  let expenses = 0;
  const categoryTotals: Record<string, number> = {};

  for (const t of current) {
    const n = Number(t.amount.toString());
    if (t.type === "INCOME") income += n;
    else expenses += n;
    if (t.type === "EXPENSE") {
      const key = t.category?.trim() ? t.category : "Other";
      categoryTotals[key] = (categoryTotals[key] ?? 0) + n;
    }
  }

  const balance = income - expenses;

  const pie = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }));

  const insights = buildInsights(current, previous);

  return {
    month,
    summary: {
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    },
    pie,
    insights: insights.lines,
    transactions: current,
  };
}
