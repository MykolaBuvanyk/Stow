import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  claimCleanupCandidates: vi.fn(),
  deleteClaimedFile: vi.fn(),
  deleteExpiredRateLimits: vi.fn(),
  releaseCleanupClaim: vi.fn(),
  removeStoredObject: vi.fn(),
}));

vi.mock("@/server/infrastructure/supabase/storage.repository", () => ({
  removeStoredObject: mocks.removeStoredObject,
}));

vi.mock("@/server/modules/maintenance/maintenance.repository", () => ({
  claimCleanupCandidates: mocks.claimCleanupCandidates,
  deleteClaimedFile: mocks.deleteClaimedFile,
  deleteExpiredRateLimits: mocks.deleteExpiredRateLimits,
  releaseCleanupClaim: mocks.releaseCleanupClaim,
}));

import { runMaintenanceSweep } from "@/server/modules/maintenance/run-maintenance-sweep.service";

const firstCandidate = {
  id: "00000000-0000-4000-8000-000000000001",
  objectPath: "owner/00000000-0000-4000-8000-000000000001",
  claimedAt: "2026-08-11T10:00:00.000Z",
};

const secondCandidate = {
  id: "00000000-0000-4000-8000-000000000002",
  objectPath: "owner/00000000-0000-4000-8000-000000000002",
  claimedAt: "2026-08-11T10:00:00.000Z",
};

describe("runMaintenanceSweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claimCleanupCandidates.mockResolvedValue([
      firstCandidate,
      secondCandidate,
    ]);
    mocks.removeStoredObject.mockResolvedValue(undefined);
    mocks.deleteClaimedFile.mockResolvedValue(true);
    mocks.deleteExpiredRateLimits.mockResolvedValue(undefined);
    mocks.releaseCleanupClaim.mockResolvedValue(undefined);
  });

  it("claims a bounded batch and removes storage before database rows", async () => {
    const result = await runMaintenanceSweep(
      new Date("2026-08-11T12:00:00.000Z"),
    );

    expect(mocks.claimCleanupCandidates).toHaveBeenCalledWith({
      pendingBefore: "2026-08-11T11:00:00.000Z",
      rejectedBefore: "2026-08-11T11:55:00.000Z",
      deletedBefore: "2026-08-11T11:55:00.000Z",
      retryBefore: "2026-08-11T11:45:00.000Z",
      limit: 50,
    });
    expect(mocks.deleteExpiredRateLimits).toHaveBeenCalledWith(
      "2026-08-10T12:00:00.000Z",
    );
    expect(mocks.removeStoredObject).toHaveBeenCalledTimes(2);
    expect(mocks.deleteClaimedFile).toHaveBeenCalledTimes(2);
    expect(mocks.removeStoredObject.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteClaimedFile.mock.invocationCallOrder[0],
    );
    expect(result).toEqual({ claimed: 2, deleted: 2, failed: 0 });
  });

  it("releases a lease and reports a failure when cleanup must be retried", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.removeStoredObject.mockImplementation(async (objectPath: string) => {
      if (objectPath === secondCandidate.objectPath) {
        throw new Error("storage unavailable");
      }
    });

    const result = await runMaintenanceSweep(
      new Date("2026-08-11T12:00:00.000Z"),
    );

    expect(mocks.releaseCleanupClaim).toHaveBeenCalledWith(secondCandidate);
    expect(mocks.deleteClaimedFile).not.toHaveBeenCalledWith(secondCandidate);
    expect(result).toEqual({ claimed: 2, deleted: 1, failed: 1 });
    consoleSpy.mockRestore();
  });
});
