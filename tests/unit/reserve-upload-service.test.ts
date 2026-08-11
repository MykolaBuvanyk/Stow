import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  createPendingFile: vi.fn(),
  createSignedUpload: vi.fn(),
  removePendingFileReservation: vi.fn(),
}));

vi.mock("@/server/modules/uploads/upload.repository", () => ({
  createPendingFile: mocks.createPendingFile,
  removePendingFileReservation: mocks.removePendingFileReservation,
}));

vi.mock("@/server/infrastructure/supabase/storage.repository", () => ({
  createSignedUpload: mocks.createSignedUpload,
}));

import { reserveUpload } from "@/server/modules/uploads/reserve-upload.service";

describe("reserveUpload", () => {
  const ownerId = "11111111-1111-4111-8111-111111111111";
  const input = {
    originalName: "report.pdf",
    declaredMime: "application/pdf" as const,
    declaredSize: 1024,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createPendingFile.mockResolvedValue(undefined);
    mocks.removePendingFileReservation.mockResolvedValue(true);
  });

  it("persists a pending row before requesting a signed token", async () => {
    mocks.createSignedUpload.mockImplementation(async (path: string) => ({
      path,
      token: "signed-token",
    }));

    const result = await reserveUpload(ownerId, input);

    expect(mocks.createPendingFile).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId,
        objectPath: `${ownerId}/${result.fileId}`,
        originalName: input.originalName,
        declaredMime: input.declaredMime,
      }),
    );
    expect(mocks.createPendingFile.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createSignedUpload.mock.invocationCallOrder[0],
    );
    expect(result.token).toBe("signed-token");
  });

  it("removes the pending reservation when token creation fails", async () => {
    const signingError = new Error("storage unavailable");
    mocks.createSignedUpload.mockRejectedValue(signingError);

    await expect(reserveUpload(ownerId, input)).rejects.toBe(signingError);

    const pendingInput = mocks.createPendingFile.mock.calls[0][0];
    expect(mocks.removePendingFileReservation).toHaveBeenCalledWith(
      pendingInput.id,
      ownerId,
    );
  });
});
