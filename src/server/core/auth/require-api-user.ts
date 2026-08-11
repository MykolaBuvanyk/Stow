import "server-only";

import { getCurrentUser } from "@/server/core/auth/require-user";
import { ApplicationError } from "@/server/core/errors/application-error";

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new ApplicationError(
      "UNAUTHENTICATED",
      "Потрібно увійти в систему.",
      401,
    );
  }

  return user;
}
