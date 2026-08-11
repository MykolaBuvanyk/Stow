import "server-only";

import { randomUUID } from "node:crypto";

import {
  reserveUploadResponseSchema,
  type ReserveUploadRequest,
  type ReserveUploadResponse,
} from "@/contracts/upload.contracts";
import { createSignedUpload } from "@/server/infrastructure/supabase/storage.repository";
import { buildObjectPath } from "@/server/modules/uploads/object-path";
import {
  createPendingFile,
  removePendingFileReservation,
} from "@/server/modules/uploads/upload.repository";

export async function reserveUpload(
  ownerId: string,
  input: ReserveUploadRequest,
): Promise<ReserveUploadResponse> {
  const fileId = randomUUID();
  const objectPath = buildObjectPath(ownerId, fileId);

  await createPendingFile({
    id: fileId,
    ownerId,
    objectPath,
    originalName: input.originalName,
    declaredMime: input.declaredMime,
    declaredSize: input.declaredSize,
  });

  try {
    const signedUpload = await createSignedUpload(objectPath);

    return reserveUploadResponseSchema.parse({
      fileId,
      ...signedUpload,
    });
  } catch (error) {
    const reservationRemoved = await removePendingFileReservation(
      fileId,
      ownerId,
    );

    if (!reservationRemoved) {
      console.error("Failed to compensate upload reservation", { fileId });
    }

    throw error;
  }
}
