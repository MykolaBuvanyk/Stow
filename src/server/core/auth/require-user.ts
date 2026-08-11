import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseRequestClient } from "@/server/infrastructure/supabase/request-client";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const supabase = await createSupabaseRequestClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims.sub) {
    return null;
  }

  return {
    id: data.claims.sub,
    email:
      typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
