import "server-only";

import { ApplicationError } from "@/server/core/errors/application-error";
import { createSupabaseAdminClient } from "@/server/infrastructure/supabase/admin-client";
import type { Tables } from "@/server/infrastructure/supabase/database.types";

type FileRow = Tables<"files">;

export async function findOwnedActiveFileRow(
  fileId: string,
  ownerId: string,
): Promise<FileRow> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new ApplicationError(
      "OWNED_FILE_READ_FAILED",
      "Не вдалося перевірити файл.",
      500,
      { cause: error },
    );
  }

  if (!data) {
    throw new ApplicationError("FILE_NOT_FOUND", "Файл не знайдено.", 404);
  }

  return data;
}

export async function softDeleteOwnedFile(
  fileId: string,
  ownerId: string,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", fileId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new ApplicationError(
      "FILE_DELETE_FAILED",
      "Не вдалося видалити файл.",
      500,
      { cause: error },
    );
  }

  return data !== null;
}
