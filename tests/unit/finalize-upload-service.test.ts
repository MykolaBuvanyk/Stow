import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  downloadStoredObject: vi.fn(),
  fileTypeFromBuffer: vi.fn(),
  findOwnedFileForFinalization: vi.fn(),
  getStoredObjectSize: vi.fn(),
  markFileReady: vi.fn(),
  markFileRejected: vi.fn(),
  removeStoredObject: vi.fn(),
}));

vi.mock("file-type", () => ({
  fileTypeFromBuffer: mocks.fileTypeFromBuffer,
}));

vi.mock("@/server/infrastructure/supabase/storage.repository", () => ({
  downloadStoredObject: mocks.downloadStoredObject,
  getStoredObjectSize: mocks.getStoredObjectSize,
  removeStoredObject: mocks.removeStoredObject,
}));

vi.mock("@/server/modules/uploads/upload.repository", () => ({
  findOwnedFileForFinalization: mocks.findOwnedFileForFinalization,
  markFileReady: mocks.markFileReady,
  markFileRejected: mocks.markFileRejected,
}));

import { MAX_FILE_SIZE_BYTES } from "@/config/file-policy";
import { ApplicationError } from "@/server/core/errors/application-error";
import { finalizeUpload } from "@/server/modules/uploads/finalize-upload.service";

const ownerId = "11111111-1111-4111-8111-111111111111";
const fileId = "22222222-2222-4222-8222-222222222222";
const pendingRow = {
  content_type: null,
  created_at: "2026-08-11T12:00:00.000Z",
  declared_mime: "application/pdf",
  declared_size_bytes: 4,
  deleted_at: null,
  finalized_at: null,
  id: fileId,
  object_path: `${ownerId}/${fileId}`,
  original_name: "report.pdf",
  owner_id: ownerId,
  size_bytes: null,
  status: "pending",
};

describe("finalizeUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOwnedFileForFinalization.mockResolvedValue(pendingRow);
    mocks.getStoredObjectSize.mockResolvedValue(4);
    mocks.downloadStoredObject.mockResolvedValue(new Blob([new Uint8Array(4)]));
    mocks.fileTypeFromBuffer.mockResolvedValue({
      ext: "pdf",
      mime: "application/pdf",
    });
    mocks.markFileRejected.mockResolvedValue(undefined);
    mocks.removeStoredObject.mockResolvedValue(undefined);
  });

  it("returns an already ready upload without reading storage again", async () => {
    const readyRow = {
      ...pendingRow,
      content_type: "application/pdf",
      finalized_at: "2026-08-11T12:01:00.000Z",
      size_bytes: 4,
      status: "ready",
    };
    mocks.findOwnedFileForFinalization.mockResolvedValue(readyRow);

    const result = await finalizeUpload(ownerId, fileId);

    expect(result.file.status).toBe("ready");
    expect(mocks.getStoredObjectSize).not.toHaveBeenCalled();
  });

  it("detects the file signature before marking a pending upload ready", async () => {
    const readyRow = {
      ...pendingRow,
      content_type: "application/pdf",
      finalized_at: "2026-08-11T12:01:00.000Z",
      size_bytes: 4,
      status: "ready",
    };
    mocks.markFileReady.mockResolvedValue(readyRow);

    const result = await finalizeUpload(ownerId, fileId);

    expect(mocks.fileTypeFromBuffer).toHaveBeenCalledOnce();
    expect(mocks.markFileReady).toHaveBeenCalledWith(fileId, ownerId, {
      contentType: "application/pdf",
      sizeBytes: 4,
    });
    expect(result.file.status).toBe("ready");
  });

  it("rejects an oversized object before downloading its body", async () => {
    mocks.getStoredObjectSize.mockResolvedValue(MAX_FILE_SIZE_BYTES + 1);

    await expect(finalizeUpload(ownerId, fileId)).rejects.toMatchObject({
      code: "FILE_CONTENT_REJECTED",
      status: 422,
    } satisfies Partial<ApplicationError>);

    expect(mocks.downloadStoredObject).not.toHaveBeenCalled();
    expect(mocks.markFileRejected).toHaveBeenCalledWith(fileId, ownerId);
    expect(mocks.removeStoredObject).toHaveBeenCalledWith(pendingRow.object_path);
  });

  it("rejects an object whose size differs from its reservation", async () => {
    mocks.getStoredObjectSize.mockResolvedValue(2048);

    await expect(finalizeUpload(ownerId, fileId)).rejects.toMatchObject({
      code: "FILE_CONTENT_REJECTED",
      status: 422,
    });

    expect(mocks.downloadStoredObject).not.toHaveBeenCalled();
    expect(mocks.markFileRejected).toHaveBeenCalledWith(fileId, ownerId);
  });

  it("rejects content whose detected MIME differs from the reservation", async () => {
    mocks.fileTypeFromBuffer.mockResolvedValue({
      ext: "png",
      mime: "image/png",
    });

    await expect(finalizeUpload(ownerId, fileId)).rejects.toMatchObject({
      code: "FILE_CONTENT_REJECTED",
    });

    expect(mocks.markFileReady).not.toHaveBeenCalled();
    expect(mocks.markFileRejected).toHaveBeenCalledWith(fileId, ownerId);
  });
});
