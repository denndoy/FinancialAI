"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
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

  if (status !== "authenticated") return null;

  const adminLink = data?.user?.isAdmin
    ? ([{ href: "/admin", labelKey: "nav.admin" as MessageKey }] as const)
    : ([] as const);
  const allLinks = [...links, ...adminLink];

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-foreground">
          Finance<span className="text-primary">AI</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
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
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {t("nav.signOut")}
          </button>
        </div>
      </div>
    </header>
  );
}
