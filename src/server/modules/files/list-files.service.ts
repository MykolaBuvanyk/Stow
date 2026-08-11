import "server-only";

import {
  listFilesResponseSchema,
  type ListFilesQuery,
  type ListFilesResponse,
} from "@/contracts/file.contracts";
import { toFileDto } from "@/server/modules/files/file.mapper";
import { listVisibleFileRows } from "@/server/modules/files/file.repository";

export async function listFiles(
  viewerId: string,
  query: ListFilesQuery,
): Promise<ListFilesResponse> {
  const { rows, total } = await listVisibleFileRows(query);

  return listFilesResponseSchema.parse({
    items: rows.map((row) => toFileDto(row, viewerId)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    hasMore: query.page * query.pageSize < total,
  });
}
