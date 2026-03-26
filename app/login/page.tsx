import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-24 text-center text-muted-foreground">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
