import "server-only";

import { fileTypeFromBuffer } from "file-type";

import {
  FILE_SIGNATURE_READ_BYTES,
  isAllowedFileType,
  MAX_FILE_SIZE_BYTES,
} from "@/config/file-policy";
import {
  finalizeUploadResponseSchema,
  type FinalizeUploadResponse,
} from "@/contracts/upload.contracts";
import { ApplicationError } from "@/server/core/errors/application-error";
import {
  downloadStoredObject,
  getStoredObjectSize,
  removeStoredObject,
} from "@/server/infrastructure/supabase/storage.repository";
import { toFileDto } from "@/server/modules/files/file.mapper";
import {
  findOwnedFileForFinalization,
  markFileReady,
  markFileRejected,
} from "@/server/modules/uploads/upload.repository";

async function rejectUploadedFile(
  fileId: string,
  ownerId: string,
  objectPath: string,
): Promise<never> {
  await markFileRejected(fileId, ownerId);

  try {
    await removeStoredObject(objectPath);
  } catch (error) {
    console.error("Failed to remove rejected upload object", {
      fileId,
      error,
    });
  }

  throw new ApplicationError(
    "FILE_CONTENT_REJECTED",
    "Вміст файлу не відповідає дозволеному формату.",
    422,
  );
}

export async function finalizeUpload(
  ownerId: string,
  fileId: string,
): Promise<FinalizeUploadResponse> {
  const reservation = await findOwnedFileForFinalization(fileId, ownerId);

  if (reservation.status === "ready") {
    return finalizeUploadResponseSchema.parse({
      file: toFileDto(reservation, ownerId),
    });
  }

  if (reservation.status !== "pending") {
    throw new ApplicationError(
      "UPLOAD_NOT_PENDING",
      "Це завантаження вже не можна завершити.",
      409,
    );
  }

  const sizeBytes = await getStoredObjectSize(reservation.object_path);

  if (
    sizeBytes < 1 ||
    sizeBytes > MAX_FILE_SIZE_BYTES ||
    sizeBytes !== reservation.declared_size_bytes
  ) {
    return rejectUploadedFile(fileId, ownerId, reservation.object_path);
  }

  const content = await downloadStoredObject(reservation.object_path);

  if (content.size !== sizeBytes) {
    throw new ApplicationError(
      "UPLOADED_OBJECT_CHANGED",
      "Файл змінився під час перевірки. Повторіть спробу.",
      409,
    );
  }

  const signature = await content
    .slice(0, FILE_SIGNATURE_READ_BYTES)
    .arrayBuffer();
  const detectedType = await fileTypeFromBuffer(signature);

  if (
    !detectedType ||
    !isAllowedFileType(detectedType.mime) ||
    detectedType.mime !== reservation.declared_mime
  ) {
    return rejectUploadedFile(fileId, ownerId, reservation.object_path);
  }

  const finalized = await markFileReady(fileId, ownerId, {
    sizeBytes,
    contentType: detectedType.mime,
  });

  if (!finalized) {
    const latest = await findOwnedFileForFinalization(fileId, ownerId);

    if (latest.status === "ready") {
      return finalizeUploadResponseSchema.parse({
        file: toFileDto(latest, ownerId),
      });
    }

    throw new ApplicationError(
      "UPLOAD_FINALIZATION_CONFLICT",
      "Стан завантаження змінився. Оновіть сторінку.",
      409,
    );
  }

  return finalizeUploadResponseSchema.parse({
    file: toFileDto(finalized, ownerId),
  });
}
