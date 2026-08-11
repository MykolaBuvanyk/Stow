import type { ReactNode } from "react";

import { LogoutButton } from "@/client/features/logout/logout-button";
import { requireUser } from "@/server/core/auth/require-user";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <strong>Stow</strong>
          {user.email ? <span>{user.email}</span> : null}
        </div>
        <LogoutButton />
      </header>
      <main>{children}</main>
    </div>
  );
}
