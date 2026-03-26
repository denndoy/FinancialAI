"use client";

import { useLocale } from "@/components/locale-provider";

export function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-card/40 py-6">
      <div className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground sm:text-sm">
        <p>FinanceAI — {t("footer.tagline")}</p>
        <p className="mt-1">
          © {year} FinanceAI. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
