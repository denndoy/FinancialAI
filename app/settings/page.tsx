"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n-messages";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { locale, setLocale, t } = useLocale();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ type: "err", text: t("settings.passwordMismatch") });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? t("settings.saveFail") });
        return;
      }
      setMessage({ type: "ok", text: t("settings.passwordOk") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage({ type: "err", text: t("settings.requestFail") });
    } finally {
      setLoading(false);
    }
  }

  function selectLanguage(next: Locale) {
    setLocale(next);
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">{t("settings.loading")}</div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-medium text-foreground">{t("settings.account")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.accountHint")}</p>
        <p className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          {session?.user?.email ?? "—"}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-medium text-foreground">{t("settings.language")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.languageHint")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { code: "id" as const, label: "settings.langId" as const },
              { code: "en" as const, label: "settings.langEn" as const },
            ] as const
          ).map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => selectLanguage(opt.code)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                locale === opt.code
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t(opt.label)}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-medium text-foreground">{t("settings.appearance")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.appearanceHint")}</p>
        <div className="mt-4 flex items-center gap-3">
          <ThemeToggle />
          <span className="text-sm text-muted-foreground">{t("settings.themeHint")}</span>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-medium text-foreground">{t("settings.password")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.passwordHint")}</p>
        <form onSubmit={(e) => void onPasswordSubmit(e)} className="mt-4 space-y-4">
          {message && (
            <p
              className={
                message.type === "ok" ? "text-sm text-emerald-600 dark:text-emerald-400" : "text-sm text-destructive"
              }
            >
              {message.text}
            </p>
          )}
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("settings.currentPassword")}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type={showCurrentPassword ? "text" : "password"}
                autoComplete="current-password"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((s) => !s)}
                aria-label={showCurrentPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                title={showCurrentPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {showCurrentPassword ? (
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
                    aria-hidden="true"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42" />
                    <path d="M9.88 5.11A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7-1.06 1.77-2.35 3.17-3.63 4.16" />
                    <path d="M6.11 6.11A18.3 18.3 0 0 0 1 12s4 7 11 7c1.06 0 2.07-.16 3.03-.47" />
                  </svg>
                ) : (
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
                    aria-hidden="true"
                  >
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("settings.newPassword")}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((s) => !s)}
                aria-label={showNewPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                title={showNewPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {showNewPassword ? (
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
                    aria-hidden="true"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42" />
                    <path d="M9.88 5.11A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7-1.06 1.77-2.35 3.17-3.63 4.16" />
                    <path d="M6.11 6.11A18.3 18.3 0 0 0 1 12s4 7 11 7c1.06 0 2.07-.16 3.03-.47" />
                  </svg>
                ) : (
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
                    aria-hidden="true"
                  >
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("settings.confirmPassword")}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                title={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {showConfirmPassword ? (
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
                    aria-hidden="true"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42" />
                    <path d="M9.88 5.11A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7-1.06 1.77-2.35 3.17-3.63 4.16" />
                    <path d="M6.11 6.11A18.3 18.3 0 0 0 1 12s4 7 11 7c1.06 0 2.07-.16 3.03-.47" />
                  </svg>
                ) : (
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
                    aria-hidden="true"
                  >
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {loading ? t("settings.saving") : t("settings.savePassword")}
          </button>
        </form>
      </section>
    </div>
  );
}
