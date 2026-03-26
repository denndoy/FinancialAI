"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="h-9 w-9 rounded-lg border border-border" />;

  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label={t("theme.toggleAria")}
      onClick={() => setTheme(theme === "system" ? next : next)}
      className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
    >
      {resolvedTheme === "dark" ? t("theme.light") : t("theme.dark")}
    </button>
  );
}
