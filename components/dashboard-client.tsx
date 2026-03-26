"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Transaction } from "@prisma/client";
import { useLocale } from "@/components/locale-provider";
import { formatIdr } from "@/lib/format-idr";
import { translate } from "@/lib/i18n-messages";
import { CategoryPie } from "./category-pie";
import { TransactionTable } from "./transaction-table";

type Summary = { income: number; expenses: number; balance: number };
type PieSlice = { name: string; value: number };

type DashboardPayload = {
  month: string;
  summary: Summary;
  pie: PieSlice[];
  insights: string[];
  transactions: Transaction[];
};

export function DashboardClient() {
  const { t, locale } = useLocale();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [search, setSearch] = useState("");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?month=${encodeURIComponent(month)}`);
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = (await res.json()) as DashboardPayload;
      setData(json);
    } catch {
      setError(translate(locale, "dashboard.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [month, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTx = useMemo(() => {
    if (!data?.transactions) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.transactions;
    return data.transactions.filter((t) => {
      const cat = t.category?.toLowerCase() ?? "";
      return t.description.toLowerCase().includes(q) || cat.includes(q);
    });
  }, [data, search]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        {t("dashboard.loading")}
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!data) return null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">
            {t("dashboard.month")}{" "}
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="ml-2 rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <a
            href={`/api/export/pdf?month=${encodeURIComponent(month)}`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("dashboard.downloadPdf")}
            title={t("dashboard.downloadPdf")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("dashboard.statIncome")} value={data.summary.income} positive />
        <StatCard label={t("dashboard.statExpenses")} value={data.summary.expenses} />
        <StatCard label={t("dashboard.statBalance")} value={data.summary.balance} highlight />
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">{t("dashboard.insights")}</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {data.insights.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-medium">{t("dashboard.spendingByCategory")}</h2>
          <CategoryPie data={data.pie} />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-medium">{t("dashboard.healthCheck")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.healthText")}</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium">{t("dashboard.transactions")}</h2>
          <input
            type="search"
            placeholder={t("dashboard.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm sm:w-auto"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <TransactionTable transactions={filteredTx} onChanged={load} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  positive,
  highlight,
}: {
  label: string;
  value: number;
  positive?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border p-5 shadow-sm ${
        highlight ? "bg-primary/10 border-primary/30" : "bg-card"
      }`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          positive ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {formatIdr(value)}
      </p>
    </div>
  );
}
