import {
  listFilesResponseSchema,
  type ListFilesQuery,
  type ListFilesResponse,
} from "@/contracts/file.contracts";
import { apiRequest } from "@/client/shared/api/api-client";

export async function getFiles(
  query: ListFilesQuery,
): Promise<ListFilesResponse> {
  const searchParams = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  const payload = await apiRequest<unknown>(`/api/files?${searchParams}`);

  return listFilesResponseSchema.parse(payload);
}
