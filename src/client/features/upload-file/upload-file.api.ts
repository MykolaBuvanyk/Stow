import {
  finalizeUploadResponseSchema,
  reserveUploadResponseSchema,
  type FinalizeUploadResponse,
  type ReserveUploadRequest,
  type ReserveUploadResponse,
} from "@/contracts/upload.contracts";
import { createSupabaseBrowserClient } from "@/client/shared/supabase/browser-client";
import {
  ApiClientError,
  apiRequest,
} from "@/client/shared/api/api-client";

export type UploadPhase = "preparing" | "uploading" | "verifying";

export async function reserveFileUpload(
  input: ReserveUploadRequest,
): Promise<ReserveUploadResponse> {
  const payload = await apiRequest<unknown>("/api/uploads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return reserveUploadResponseSchema.parse(payload);
}

export async function finalizeFileUpload(
  fileId: string,
): Promise<FinalizeUploadResponse> {
  const payload = await apiRequest<unknown>(
    `/api/uploads/${encodeURIComponent(fileId)}/finalize`,
    { method: "POST" },
  );

  return finalizeUploadResponseSchema.parse(payload);
}

export async function uploadFile(
  file: File,
  onPhaseChange: (phase: UploadPhase) => void,
): Promise<FinalizeUploadResponse> {
  onPhaseChange("preparing");
  const reservation = await reserveFileUpload({
    originalName: file.name,
    declaredMime: file.type as ReserveUploadRequest["declaredMime"],
    declaredSize: file.size,
  });

  onPhaseChange("uploading");
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from("vault")
    .uploadToSignedUrl(reservation.path, reservation.token, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error || !data || data.path !== reservation.path) {
    throw new ApiClientError(
      "SIGNED_UPLOAD_FAILED",
      0,
      "Не вдалося передати файл у сховище.",
    );
  }

  onPhaseChange("verifying");
  return finalizeFileUpload(reservation.fileId);
}
