import "server-only";

import {
  downloadResponseSchema,
  type DownloadResponse,
} from "@/contracts/download.contracts";
import { createSignedDownload } from "@/server/infrastructure/supabase/storage.repository";
import { findVisibleReadyFileRow } from "@/server/modules/files/file.repository";

function safeDownloadName(originalName: string): string {
  return originalName.replace(/[\\/\u0000-\u001f\u007f]/gu, "_");
}

export async function prepareFileDownload(
  fileId: string,
): Promise<DownloadResponse> {
  const file = await findVisibleReadyFileRow(fileId);
  const signedDownload = await createSignedDownload(
    file.object_path,
    safeDownloadName(file.original_name),
  );

  return downloadResponseSchema.parse(signedDownload);
}
