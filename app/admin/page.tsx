"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

type UserRow = {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  transactionCount: number;
};

type Stats = { userCount: number; transactionCount: number; adminCount: number };

export default function AdminPage() {
  const { data: session, update } = useSession();
  const { t } = useLocale();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [uRes, sRes] = await Promise.all([fetch("/api/admin/users"), fetch("/api/admin/stats")]);
      if (!uRes.ok || !sRes.ok) {
        setError(t("admin.loadError"));
        return;
      }
      const uJson = (await uRes.json()) as { users: UserRow[] };
      const sJson = (await sRes.json()) as Stats;
      setUsers(uJson.users);
      setStats(sJson);
    } catch {
      setError(t("admin.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleAdmin(u: UserRow) {
    setBusyId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !u.isAdmin }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("admin.actionError"));
        return;
      }
      if (u.id === session?.user?.id) {
        await update();
      }
      await load();
    } catch {
      setError(t("admin.actionError"));
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(u: UserRow) {
    if (!confirm(t("admin.confirmDelete").replace("{username}", u.username))) return;
    setBusyId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("admin.actionError"));
        return;
      }
      await load();
    } catch {
      setError(t("admin.actionError"));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">{t("admin.loading")}</div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("admin.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
        </div>
        <Link
          href="/dashboard"
          className="w-fit rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          {t("admin.back")}
        </Link>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{t("admin.statUsers")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.userCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{t("admin.statTransactions")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.transactionCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{t("admin.statAdmins")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.adminCount}</p>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium">{t("admin.usersTitle")}</h2>
          <button
            type="button"
            onClick={() => void load()}
            className="w-fit rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            {t("admin.refresh")}
          </button>
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <p className="mt-3 text-xs text-muted-foreground">{t("admin.hintEnv")}</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("admin.colUsername")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.colJoined")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("admin.colTx")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.colAdmin")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <span className="font-medium">{u.username}</span>
                    {u.id === session?.user?.id ? (
                      <span className="ml-2 text-xs text-muted-foreground">({t("admin.you")})</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(u.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.transactionCount}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => void toggleAdmin(u)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        u.isAdmin
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      } disabled:opacity-50`}
                    >
                      {u.isAdmin ? t("admin.badgeAdmin") : t("admin.badgeUser")}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== session?.user?.id ? (
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => void removeUser(u)}
                        className="text-destructive hover:underline disabled:opacity-50"
                      >
                        {t("admin.delete")}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.emptyUsers")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
