import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { getFiles } from "@/client/entities/file/file.api";
import type { ListFilesQuery } from "@/contracts/file.contracts";

export const DEFAULT_FILE_LIST_QUERY = {
  page: 1,
  pageSize: 25,
} satisfies ListFilesQuery;

export const filesQueryRootKey = ["files"] as const;

export function filesQueryKey(query: ListFilesQuery) {
  return [...filesQueryRootKey, "list", query] as const;
}

export function filesQueryOptions(query: ListFilesQuery) {
  return queryOptions({
    queryKey: filesQueryKey(query),
    queryFn: () => getFiles(query),
    placeholderData: keepPreviousData,
  });
}
