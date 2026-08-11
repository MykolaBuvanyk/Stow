import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/core/auth/require-user";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/files");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">{children}</section>
    </main>
  );
}
