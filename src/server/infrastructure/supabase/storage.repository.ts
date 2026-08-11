import "server-only";

import { SIGNED_DOWNLOAD_TTL_SECONDS } from "@/config/file-policy";
import { ApplicationError } from "@/server/core/errors/application-error";
import { createSupabaseAdminClient } from "@/server/infrastructure/supabase/admin-client";

const VAULT_BUCKET = "vault";

export type SignedUpload = {
  path: string;
  token: string;
};

export async function createSignedUpload(
  objectPath: string,
): Promise<SignedUpload> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(VAULT_BUCKET)
    .createSignedUploadUrl(objectPath, { upsert: false });

  if (error || !data || data.path !== objectPath) {
    throw new ApplicationError(
      "SIGNED_UPLOAD_FAILED",
      "Не вдалося підготувати пряме завантаження.",
      500,
      { cause: error ?? undefined },
    );
  }

  return {
    path: data.path,
    token: data.token,
  };
}

export async function getStoredObjectSize(objectPath: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const bucket = supabase.storage.from(VAULT_BUCKET);
  const { data: info, error: infoError } = await bucket.info(objectPath);

  if (
    infoError ||
    !info ||
    typeof info.size !== "number" ||
    !Number.isSafeInteger(info.size) ||
    info.size < 0
  ) {
    throw new ApplicationError(
      "UPLOADED_OBJECT_NOT_FOUND",
      "Завантажений файл не знайдено.",
      409,
      { cause: infoError ?? undefined },
    );
  }

  return info.size;
}

export async function downloadStoredObject(objectPath: string): Promise<Blob> {
  const supabase = createSupabaseAdminClient();
  const { data: content, error: downloadError } = await supabase.storage
    .from(VAULT_BUCKET)
    .download(objectPath, {}, { cache: "no-store" });

  if (downloadError || !content) {
    throw new ApplicationError(
      "UPLOADED_OBJECT_READ_FAILED",
      "Не вдалося перевірити завантажений файл.",
      500,
      { cause: downloadError ?? undefined },
    );
  }

  return content;
}

export async function removeStoredObject(objectPath: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(VAULT_BUCKET).remove([objectPath]);

  if (error) {
    throw new ApplicationError(
      "STORED_OBJECT_DELETE_FAILED",
      "Не вдалося видалити файл зі сховища.",
      500,
      { cause: error },
    );
  }
}

export async function createSignedDownload(
  objectPath: string,
  downloadName: string,
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(objectPath, SIGNED_DOWNLOAD_TTL_SECONDS, {
      download: downloadName,
    });

  if (error || !data) {
    throw new ApplicationError(
      "SIGNED_DOWNLOAD_FAILED",
      "Не вдалося підготувати скачування файлу.",
      500,
      { cause: error ?? undefined },
    );
  }

  return {
    signedUrl: data.signedUrl,
    expiresIn: SIGNED_DOWNLOAD_TTL_SECONDS,
  };
}
