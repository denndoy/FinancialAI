"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { LocaleProvider } from "@/components/locale-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <LocaleProvider>{children}</LocaleProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
