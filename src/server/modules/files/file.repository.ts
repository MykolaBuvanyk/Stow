import "server-only";

import { ApplicationError } from "@/server/core/errors/application-error";
import { createSupabaseRequestClient } from "@/server/infrastructure/supabase/request-client";

export type ListVisibleFilesParams = {
  page: number;
  pageSize: number;
};

export async function listVisibleFileRows({
  page,
  pageSize,
}: ListVisibleFilesParams) {
  const supabase = await createSupabaseRequestClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("files")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw new ApplicationError(
      "FILES_READ_FAILED",
      "Не вдалося отримати список файлів.",
      500,
      { cause: error },
    );
  }

  return {
    rows: data,
    total: count ?? 0,
  };
}

export async function findVisibleReadyFileRow(fileId: string) {
  const supabase = await createSupabaseRequestClient();
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("status", "ready")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new ApplicationError(
      "FILE_READ_FAILED",
      "Не вдалося перевірити доступ до файлу.",
      500,
      { cause: error },
    );
  }

  if (!data) {
    throw new ApplicationError("FILE_NOT_FOUND", "Файл не знайдено.", 404);
  }

  return data;
}
