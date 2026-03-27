"use client";

import { Suspense } from "react";
import { useLocale } from "@/components/locale-provider";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const { t } = useLocale();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-24 text-center text-muted-foreground">
          {t("login.loading")}
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
