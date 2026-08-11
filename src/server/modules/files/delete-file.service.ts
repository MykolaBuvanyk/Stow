import "server-only";

import { removeStoredObject } from "@/server/infrastructure/supabase/storage.repository";
import {
  findOwnedActiveFileRow,
  softDeleteOwnedFile,
} from "@/server/modules/files/file-management.repository";
import { deleteAllFileShares } from "@/server/modules/files/share.repository";

export async function deleteFile(ownerId: string, fileId: string): Promise<void> {
  const file = await findOwnedActiveFileRow(fileId, ownerId);
  const deleted = await softDeleteOwnedFile(fileId, ownerId);

  if (!deleted) {
    return;
  }

  const cleanupResults = await Promise.allSettled([
    removeStoredObject(file.object_path),
    deleteAllFileShares(fileId),
  ]);

  for (const [index, result] of cleanupResults.entries()) {
    if (result.status === "rejected") {
      console.error("Failed to clean up a soft-deleted file", {
        fileId,
        target: index === 0 ? "storage" : "shares",
        error: result.reason,
      });
    }
  }
}
