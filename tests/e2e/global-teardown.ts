import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const E2E_EMAIL_PREFIX = "stow-e2e-";
const { loadEnvConfig } = nextEnv;

export default async function globalTeardown() {
  loadEnvConfig(process.cwd());

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1_000,
  });

  if (error) {
    throw error;
  }

  for (const user of data.users) {
    if (!user.email?.startsWith(E2E_EMAIL_PREFIX)) {
      continue;
    }

    const { data: objects, error: listError } = await supabase.storage
      .from("vault")
      .list(user.id, { limit: 1_000 });

    if (listError) {
      throw listError;
    }

    if (objects.length > 0) {
      const { error: removeError } = await supabase.storage
        .from("vault")
        .remove(objects.map((object) => `${user.id}/${object.name}`));

      if (removeError) {
        throw removeError;
      }
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      throw deleteError;
    }
  }
}
