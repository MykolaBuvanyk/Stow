import "server-only";

import { MAX_FILE_SHARES } from "@/config/file-policy";
import { ApplicationError } from "@/server/core/errors/application-error";
import { createSupabaseAdminClient } from "@/server/infrastructure/supabase/admin-client";

export type ShareRequestRow = {
  shareId: string;
  email: string;
  createdAt: string;
};

export async function requestFileShare(
  fileId: string,
  ownerId: string,
  normalizedEmail: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("request_file_share", {
    p_file_id: fileId,
    p_owner_id: ownerId,
    p_recipient_email: normalizedEmail,
  });

  if (error || !data?.[0]) {
    if (error?.message.includes("share_request_limit")) {
      throw new ApplicationError(
        "SHARE_LIMIT_REACHED",
        "Досягнуто ліміт доступів до цього файлу.",
        409,
      );
    }

    throw new ApplicationError(
      "SHARE_REQUEST_FAILED",
      "Не вдалося прийняти запит на доступ.",
      500,
      { cause: error ?? undefined },
    );
  }
}

export async function listFileShares(fileId: string): Promise<ShareRequestRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("file_share_requests")
    .select("id, recipient_email, created_at")
    .eq("file_id", fileId)
    .order("created_at", { ascending: true })
    .range(0, MAX_FILE_SHARES - 1);

  if (error) {
    throw new ApplicationError(
      "SHARES_READ_FAILED",
      "Не вдалося отримати список доступів.",
      500,
      { cause: error },
    );
  }

  return data.map((share) => ({
    shareId: share.id,
    email: share.recipient_email,
    createdAt: share.created_at,
  }));
}

export async function deleteFileShare(
  fileId: string,
  ownerId: string,
  shareId: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("revoke_file_share_request", {
    p_file_id: fileId,
    p_owner_id: ownerId,
    p_share_id: shareId,
  });

  if (error) {
    throw new ApplicationError(
      "SHARE_DELETE_FAILED",
      "Не вдалося скасувати доступ.",
      500,
      { cause: error },
    );
  }

  if (!data) {
    throw new ApplicationError("SHARE_NOT_FOUND", "Доступ не знайдено.", 404);
  }
}

export async function deleteAllFileShares(fileId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const [requestsResult, sharesResult] = await Promise.all([
    supabase.from("file_share_requests").delete().eq("file_id", fileId),
    supabase.from("file_shares").delete().eq("file_id", fileId),
  ]);
  const error = requestsResult.error ?? sharesResult.error;

  if (error) {
    throw new ApplicationError(
      "SHARES_DELETE_FAILED",
      "Не вдалося очистити доступи до файла.",
      500,
      { cause: error },
    );
  }
}

