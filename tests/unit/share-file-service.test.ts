import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  deleteFileShare: vi.fn(),
  findOwnedActiveFileRow: vi.fn(),
  listFileShares: vi.fn(),
  requestFileShare: vi.fn(),
}));

vi.mock("@/server/modules/files/file-management.repository", () => ({
  findOwnedActiveFileRow: mocks.findOwnedActiveFileRow,
}));

vi.mock("@/server/modules/files/share.repository", () => ({
  deleteFileShare: mocks.deleteFileShare,
  listFileShares: mocks.listFileShares,
  requestFileShare: mocks.requestFileShare,
}));

import {
  getFileShares,
  revokeFileShare,
  shareFileWithEmail,
} from "@/server/modules/files/share-file.service";

const ownerId = "11111111-1111-4111-8111-111111111111";
const shareId = "22222222-2222-4222-8222-222222222222";
const fileId = "33333333-3333-4333-8333-333333333333";

describe("file sharing service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOwnedActiveFileRow.mockResolvedValue({ status: "ready" });
    mocks.requestFileShare.mockResolvedValue(undefined);
    mocks.listFileShares.mockResolvedValue([]);
    mocks.deleteFileShare.mockResolvedValue(undefined);
  });

  it("accepts the request only after checking ownership and ready status", async () => {
    const result = await shareFileWithEmail(
      ownerId,
      "owner@example.com",
      fileId,
      "grantee@example.com",
    );

    expect(mocks.findOwnedActiveFileRow).toHaveBeenCalledWith(fileId, ownerId);
    expect(mocks.requestFileShare).toHaveBeenCalledWith(
      fileId,
      ownerId,
      "grantee@example.com",
    );
    expect(result).toEqual({ accepted: true });
  });

  it("does not expose recipient registration state in the response", async () => {
    await expect(
      shareFileWithEmail(
        ownerId,
        "owner@example.com",
        fileId,
        "unknown@example.com",
      ),
    ).resolves.toEqual({ accepted: true });
  });

  it("accepts an owner's own email without creating a redundant request", async () => {
    await expect(
      shareFileWithEmail(
        ownerId,
        "owner@example.com",
        fileId,
        "owner@example.com",
      ),
    ).resolves.toEqual({ accepted: true });

    expect(mocks.requestFileShare).not.toHaveBeenCalled();
  });

  it("blocks share operations for non-ready files", async () => {
    mocks.findOwnedActiveFileRow.mockResolvedValue({ status: "pending" });

    await expect(getFileShares(ownerId, fileId)).rejects.toMatchObject({
      code: "FILE_NOT_READY",
      status: 409,
    });
    expect(mocks.listFileShares).not.toHaveBeenCalled();
  });

  it("checks owner access before revoking a share", async () => {
    await revokeFileShare(ownerId, fileId, shareId);

    expect(mocks.findOwnedActiveFileRow).toHaveBeenCalledWith(fileId, ownerId);
    expect(mocks.deleteFileShare).toHaveBeenCalledWith(fileId, ownerId, shareId);
  });
});
