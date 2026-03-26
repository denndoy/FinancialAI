"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useLocale } from "@/components/locale-provider";

export default function RegisterPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("register.failed"));
        return;
      }
      const sign = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (sign?.error) {
        setError(t("register.signInAfterFail"));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("register.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("register.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("register.subtitle")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <label className="block text-sm">
          <span className="text-muted-foreground">{t("register.email")}</span>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">{t("register.password")}</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {showPassword ? (
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
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60"
        >
          {loading ? t("register.creating") : t("register.submit")}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("register.hasAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("register.signIn")}
        </Link>
      </p>
    </div>
  );
}
