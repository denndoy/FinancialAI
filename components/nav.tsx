"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n-messages";
import { ThemeToggle } from "./theme-toggle";

const links: { href: string; labelKey: MessageKey }[] = [
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/upload-receipt", labelKey: "nav.scanReceipt" },
  { href: "/add-transaction", labelKey: "nav.addTransaction" },
  { href: "/settings", labelKey: "nav.settings" },
];

export function Nav() {
  const pathname = usePathname();
  const { status, data } = useSession();
  const { t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (status !== "authenticated") return null;

  const adminLink = data?.user?.isAdmin
    ? ([{ href: "/admin", labelKey: "nav.admin" as MessageKey }] as const)
    : ([] as const);
  const allLinks = [...links, ...adminLink];

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-foreground">
            Finance<span className="text-primary">AI</span>
          </Link>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              aria-expanded={menuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {menuOpen ? (
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
                  <line x1="18" x2="6" y1="6" y2="18" />
                  <line x1="6" x2="18" y1="6" y2="18" />
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
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              )}
            </button>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <nav className="flex items-center gap-1">
              {allLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === l.href
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {t(l.labelKey)}
                </Link>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </div>

        <div className={cn("md:hidden", menuOpen ? "mt-4 block" : "hidden")}>
          <nav className="space-y-1 rounded-xl border border-border bg-card p-2">
            {allLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === l.href
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t(l.labelKey)}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
