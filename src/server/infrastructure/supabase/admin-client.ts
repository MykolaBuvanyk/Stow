import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/config/public-env";
import { serverEnv } from "@/config/server-env";
import type { Database } from "@/server/infrastructure/supabase/database.types";

export function createSupabaseAdminClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
