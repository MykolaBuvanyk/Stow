import "server-only";

import type { AllowedFileType } from "@/config/file-policy";
import { ApplicationError } from "@/server/core/errors/application-error";
import { createSupabaseAdminClient } from "@/server/infrastructure/supabase/admin-client";
import type { Tables } from "@/server/infrastructure/supabase/database.types";

type FileRow = Tables<"files">;

export type PendingFileInput = {
  declaredSize: number;
  id: string;
  ownerId: string;
  objectPath: string;
  originalName: string;
  declaredMime: AllowedFileType;
};

export async function createPendingFile(
  input: PendingFileInput,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("reserve_file_upload", {
    p_declared_mime: input.declaredMime,
    p_declared_size_bytes: input.declaredSize,
    p_id: input.id,
    p_object_path: input.objectPath,
    p_original_name: input.originalName,
    p_owner_id: input.ownerId,
  });

  if (error) {
    if (error.message.includes("pending_upload_limit")) {
      throw new ApplicationError(
        "PENDING_UPLOAD_LIMIT",
        "Завершіть або дочекайтеся очищення попередніх завантажень.",
        429,
      );
    }

    if (error.message.includes("storage_quota_exceeded")) {
      throw new ApplicationError(
        "STORAGE_QUOTA_EXCEEDED",
        "Недостатньо місця у сховищі для цього файлу.",
        413,
      );
    }

    throw new ApplicationError(
      "UPLOAD_RESERVATION_FAILED",
      "Не вдалося зарезервувати завантаження.",
      500,
      { cause: error },
    );
  }
}

export async function removePendingFileReservation(
  fileId: string,
  ownerId: string,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId)
    .eq("owner_id", ownerId)
    .eq("status", "pending");

  return error === null;
}

export async function findOwnedFileForFinalization(
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
      "UPLOAD_READ_FAILED",
      "Не вдалося перевірити завантаження.",
      500,
      { cause: error },
    );
  }

  if (!data) {
    throw new ApplicationError(
      "UPLOAD_NOT_FOUND",
      "Завантаження не знайдено.",
      404,
    );
  }

  return data;
}

export async function markFileReady(
  fileId: string,
  ownerId: string,
  metadata: { sizeBytes: number; contentType: AllowedFileType },
): Promise<FileRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("files")
    .update({
      size_bytes: metadata.sizeBytes,
      content_type: metadata.contentType,
      finalized_at: new Date().toISOString(),
      status: "ready",
    })
    .eq("id", fileId)
    .eq("owner_id", ownerId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new ApplicationError(
      "UPLOAD_FINALIZATION_FAILED",
      "Не вдалося завершити завантаження.",
      500,
      { cause: error },
    );
  }

  return data;
}

export async function markFileRejected(
  fileId: string,
  ownerId: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("files")
    .update({ status: "rejected" })
    .eq("id", fileId)
    .eq("owner_id", ownerId)
    .eq("status", "pending")
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError(
      "UPLOAD_REJECTION_FAILED",
      "Не вдалося відхилити небезпечний файл.",
      500,
      { cause: error },
    );
  }
}
