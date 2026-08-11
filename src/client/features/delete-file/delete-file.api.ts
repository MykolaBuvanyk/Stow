import { apiRequest } from "@/client/shared/api/api-client";

export async function deleteFile(fileId: string): Promise<void> {
  await apiRequest<null>(`/api/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
  });
}
