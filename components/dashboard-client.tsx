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

type ServiceStatus = "ok" | "warn" | "down";
type HealthPayload = {
  overall: ServiceStatus;
  services: {
    db: ServiceStatus;
    storage: ServiceStatus;
    ocr: ServiceStatus;
  };
  checkedAt: string;
};

const HEALTH_SERVICES: { key: keyof HealthPayload["services"]; labelKey: "dashboard.health.serviceDb" | "dashboard.health.serviceStorage" | "dashboard.health.serviceOcr" }[] = [
  { key: "db", labelKey: "dashboard.health.serviceDb" },
  { key: "storage", labelKey: "dashboard.health.serviceStorage" },
  { key: "ocr", labelKey: "dashboard.health.serviceOcr" },
];

export function DashboardClient() {
  const { t, locale } = useLocale();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [search, setSearch] = useState("");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load health");
      const json = (await res.json()) as HealthPayload;
      setHealth(json);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

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

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

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
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-medium">{t("dashboard.healthCheck")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.healthText")}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadHealth()}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <polyline points="21 3 21 9 15 9" />
              </svg>
              {t("dashboard.healthRefresh")}
            </button>
          </div>

          {healthLoading ? (
            <div className="mt-4 space-y-3">
              <div className="h-8 animate-pulse rounded-lg bg-muted/70" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-14 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-14 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-14 animate-pulse rounded-lg bg-muted/60" />
              </div>
              <p className="text-sm text-muted-foreground">{t("dashboard.healthLoading")}</p>
            </div>
          ) : !health ? (
            <p className="mt-2 text-sm text-destructive">{t("dashboard.healthUnavailable")}</p>
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between rounded-lg border border-border/70 bg-background/70 p-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.healthOverall")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {t(`dashboard.healthStatus.${health.overall}` as never)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusBadgeTone(
                    health.overall
                  )}`}
                >
                  <span className={`h-2 w-2 rounded-full ${statusDotTone(health.overall)}`} />
                  {health.overall.toUpperCase()}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${healthProgressTone(
                    health.services
                  )}`}
                  style={{ width: `${healthyCount(health.services) * 33.33}%` }}
                />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {HEALTH_SERVICES.map((service) => {
                  const status = health.services[service.key];
                  return (
                    <div
                      key={service.key}
                      className="rounded-lg border border-border/70 bg-background/60 px-3 py-2"
                    >
                      <p className="text-xs text-muted-foreground">{t(service.labelKey)}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium">
                        <span className={`h-2 w-2 rounded-full ${statusDotTone(status)}`} />
                        {t(`dashboard.healthStatus.${status}` as never)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {t("dashboard.health.checkedAt")}: {new Date(health.checkedAt).toLocaleString()}
              </p>
            </>
          )}
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

function healthyCount(services: HealthPayload["services"]) {
  return Object.values(services).filter((s) => s === "ok").length;
}

function statusBadgeTone(status: ServiceStatus) {
  if (status === "ok") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (status === "warn") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
}

function statusDotTone(status: ServiceStatus) {
  if (status === "ok") return "bg-emerald-500";
  if (status === "warn") return "bg-amber-500";
  return "bg-rose-500";
}

function healthProgressTone(services: HealthPayload["services"]) {
  const okCount = healthyCount(services);
  if (okCount === 3) return "bg-emerald-500";
  if (okCount >= 1) return "bg-amber-500";
  return "bg-rose-500";
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
