import "server-only";

import {
  DELETED_FILE_GRACE_MS,
  REJECTED_FILE_GRACE_MS,
  RATE_LIMIT_RETENTION_MS,
  STALE_PENDING_AGE_MS,
  SWEEP_BATCH_SIZE,
  SWEEP_CONCURRENCY,
  SWEEP_LEASE_MS,
} from "@/config/maintenance-policy";
import {
  maintenanceSweepResponseSchema,
  type MaintenanceSweepResponse,
} from "@/contracts/maintenance.contracts";
import { removeStoredObject } from "@/server/infrastructure/supabase/storage.repository";
import {
  claimCleanupCandidates,
  deleteClaimedFile,
  deleteExpiredRateLimits,
  releaseCleanupClaim,
  type CleanupCandidate,
} from "@/server/modules/maintenance/maintenance.repository";

type CleanupOutcome = "deleted" | "failed";

function before(now: Date, ageMs: number): string {
  return new Date(now.getTime() - ageMs).toISOString();
}

async function releaseAfterFailure(candidate: CleanupCandidate, error: unknown) {
  console.error("Maintenance cleanup failed", {
    fileId: candidate.id,
    error,
  });

  try {
    await releaseCleanupClaim(candidate);
  } catch (releaseError) {
    console.error("Maintenance cleanup lease release failed", {
      fileId: candidate.id,
      error: releaseError,
    });
  }
}

async function cleanCandidate(
  candidate: CleanupCandidate,
): Promise<CleanupOutcome> {
  try {
    await removeStoredObject(candidate.objectPath);
    const deleted = await deleteClaimedFile(candidate);

    if (!deleted) {
      throw new Error("Cleanup lease was lost before database deletion.");
    }

    return "deleted";
  } catch (error) {
    await releaseAfterFailure(candidate, error);
    return "failed";
  }
}

export async function runMaintenanceSweep(
  now = new Date(),
): Promise<MaintenanceSweepResponse> {
  const [candidates] = await Promise.all([
    claimCleanupCandidates({
      pendingBefore: before(now, STALE_PENDING_AGE_MS),
      rejectedBefore: before(now, REJECTED_FILE_GRACE_MS),
      deletedBefore: before(now, DELETED_FILE_GRACE_MS),
      retryBefore: before(now, SWEEP_LEASE_MS),
      limit: SWEEP_BATCH_SIZE,
    }),
    deleteExpiredRateLimits(before(now, RATE_LIMIT_RETENTION_MS)),
  ]);
  const outcomes: CleanupOutcome[] = [];

  for (let index = 0; index < candidates.length; index += SWEEP_CONCURRENCY) {
    const batch = candidates.slice(index, index + SWEEP_CONCURRENCY);
    outcomes.push(...(await Promise.all(batch.map(cleanCandidate))));
  }

  return maintenanceSweepResponseSchema.parse({
    claimed: candidates.length,
    deleted: outcomes.filter((outcome) => outcome === "deleted").length,
    failed: outcomes.filter((outcome) => outcome === "failed").length,
  });
}
