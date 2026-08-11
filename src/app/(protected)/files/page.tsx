import type { Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import {
  DEFAULT_FILE_LIST_QUERY,
  filesQueryKey,
} from "@/client/entities/file/file.queries";
import { FilesPage as FilesPageClient } from "@/client/modules/files/files-page";
import { requireUser } from "@/server/core/auth/require-user";
import { listFiles } from "@/server/modules/files/list-files.service";

export const metadata: Metadata = {
  title: "Файли — Stow",
};

export default async function FilesPage() {
  const user = await requireUser();
  const initialFiles = await listFiles(user.id, DEFAULT_FILE_LIST_QUERY);
  const queryClient = new QueryClient();

  queryClient.setQueryData(
    filesQueryKey(DEFAULT_FILE_LIST_QUERY),
    initialFiles,
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FilesPageClient />
    </HydrationBoundary>
  );
}
