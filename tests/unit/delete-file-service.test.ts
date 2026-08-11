import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  deleteAllFileShares: vi.fn(),
  findOwnedActiveFileRow: vi.fn(),
  removeStoredObject: vi.fn(),
  softDeleteOwnedFile: vi.fn(),
}));

vi.mock("@/server/infrastructure/supabase/storage.repository", () => ({
  removeStoredObject: mocks.removeStoredObject,
}));

vi.mock("@/server/modules/files/file-management.repository", () => ({
  findOwnedActiveFileRow: mocks.findOwnedActiveFileRow,
  softDeleteOwnedFile: mocks.softDeleteOwnedFile,
}));

vi.mock("@/server/modules/files/share.repository", () => ({
  deleteAllFileShares: mocks.deleteAllFileShares,
}));

import { deleteFile } from "@/server/modules/files/delete-file.service";

describe("deleteFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOwnedActiveFileRow.mockResolvedValue({
      object_path: "owner/file",
    });
    mocks.softDeleteOwnedFile.mockResolvedValue(true);
    mocks.removeStoredObject.mockResolvedValue(undefined);
    mocks.deleteAllFileShares.mockResolvedValue(undefined);
  });

  it("hides the file before cleaning storage and shares", async () => {
    await deleteFile("owner-id", "file-id");

    expect(mocks.softDeleteOwnedFile.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.removeStoredObject.mock.invocationCallOrder[0],
    );
    expect(mocks.softDeleteOwnedFile.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteAllFileShares.mock.invocationCallOrder[0],
    );
    expect(mocks.removeStoredObject).toHaveBeenCalledWith("owner/file");
    expect(mocks.deleteAllFileShares).toHaveBeenCalledWith("file-id");
  });

  it("keeps deletion successful when background cleanup must be retried", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.removeStoredObject.mockRejectedValue(new Error("storage unavailable"));

    await expect(deleteFile("owner-id", "file-id")).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to clean up a soft-deleted file",
      expect.objectContaining({ fileId: "file-id", target: "storage" }),
    );
    consoleSpy.mockRestore();
  });
});
