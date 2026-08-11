import "server-only";

import {
  createShareResponseSchema,
  listSharesResponseSchema,
  type CreateShareResponse,
  type ListSharesResponse,
} from "@/contracts/share.contracts";
import { ApplicationError } from "@/server/core/errors/application-error";
import { findOwnedActiveFileRow } from "@/server/modules/files/file-management.repository";
import {
  deleteFileShare,
  listFileShares,
  requestFileShare,
} from "@/server/modules/files/share.repository";

async function requireOwnedReadyFile(fileId: string, ownerId: string) {
  const file = await findOwnedActiveFileRow(fileId, ownerId);

  if (file.status !== "ready") {
    throw new ApplicationError(
      "FILE_NOT_READY",
      "Доступ можна налаштувати лише для готового файлу.",
      409,
    );
  }

  return file;
}

export async function shareFileWithEmail(
  ownerId: string,
  ownerEmail: string | null,
  fileId: string,
  normalizedEmail: string,
): Promise<CreateShareResponse> {
  await requireOwnedReadyFile(fileId, ownerId);

  if (ownerEmail?.toLowerCase() !== normalizedEmail) {
    await requestFileShare(fileId, ownerId, normalizedEmail);
  }

  return createShareResponseSchema.parse({
    accepted: true,
  });
}

export async function getFileShares(
  ownerId: string,
  fileId: string,
): Promise<ListSharesResponse> {
  await requireOwnedReadyFile(fileId, ownerId);
  const shares = await listFileShares(fileId);

  return listSharesResponseSchema.parse({ items: shares });
}

export async function revokeFileShare(
  ownerId: string,
  fileId: string,
  shareId: string,
): Promise<void> {
  await requireOwnedReadyFile(fileId, ownerId);
  await deleteFileShare(fileId, ownerId, shareId);
}
