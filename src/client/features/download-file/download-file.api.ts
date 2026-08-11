import {
  downloadResponseSchema,
  type DownloadResponse,
} from "@/contracts/download.contracts";
import { apiRequest } from "@/client/shared/api/api-client";

export async function getFileDownload(
  fileId: string,
): Promise<DownloadResponse> {
  const payload = await apiRequest<unknown>(
    `/api/files/${encodeURIComponent(fileId)}/download`,
  );

  return downloadResponseSchema.parse(payload);
}
