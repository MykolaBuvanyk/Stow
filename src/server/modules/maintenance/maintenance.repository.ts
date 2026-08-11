import "server-only";

import { ApplicationError } from "@/server/core/errors/application-error";
import { createSupabaseAdminClient } from "@/server/infrastructure/supabase/admin-client";

export type CleanupCandidate = {
  id: string;
  objectPath: string;
  claimedAt: string;
};

export type ClaimCleanupCandidatesInput = {
  pendingBefore: string;
  rejectedBefore: string;
  deletedBefore: string;
  retryBefore: string;
  limit: number;
};

export async function deleteExpiredRateLimits(before: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("api_rate_limits")
    .delete()
    .lt("window_started_at", before);

  if (error) {
    throw new ApplicationError(
      "RATE_LIMIT_CLEANUP_FAILED",
      "Не вдалося очистити застарілі ліміти запитів.",
      500,
      { cause: error },
    );
  }
}

export async function claimCleanupCandidates(
  input: ClaimCleanupCandidatesInput,
): Promise<CleanupCandidate[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    "claim_file_cleanup_candidates",
    {
      p_pending_before: input.pendingBefore,
      p_rejected_before: input.rejectedBefore,
      p_deleted_before: input.deletedBefore,
      p_retry_before: input.retryBefore,
      p_limit: input.limit,
    },
  );

  if (error) {
    throw new ApplicationError(
      "CLEANUP_CLAIM_FAILED",
      "Не вдалося підготувати очищення файлів.",
      500,
      { cause: error },
    );
  }

  return data.map((candidate) => ({
    id: candidate.id,
    objectPath: candidate.object_path,
    claimedAt: candidate.claimed_at,
  }));
}

export async function deleteClaimedFile(
  candidate: CleanupCandidate,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("files")
    .delete()
    .eq("id", candidate.id)
    .eq("cleanup_claimed_at", candidate.claimedAt)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new ApplicationError(
      "CLEANUP_FILE_DELETE_FAILED",
      "Не вдалося завершити очищення файлу.",
      500,
      { cause: error },
    );
  }

  return data !== null;
}

export async function releaseCleanupClaim(
  candidate: CleanupCandidate,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("files")
    .update({ cleanup_claimed_at: null })
    .eq("id", candidate.id)
    .eq("cleanup_claimed_at", candidate.claimedAt);

  if (error) {
    throw new ApplicationError(
      "CLEANUP_RELEASE_FAILED",
      "Не вдалося звільнити службове блокування файлу.",
      500,
      { cause: error },
    );
  }
}
