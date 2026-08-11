import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";

import { MAX_FILE_SIZE_BYTES } from "@/config/file-policy";

test("database abuse controls are atomic and enforce upload quotas", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  expect(supabaseUrl).toBeTruthy();
  expect(serviceRoleKey).toBeTruthy();

  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const { data: ownerData, error: ownerError } =
    await supabase.auth.admin.createUser({
      email: `stow-e2e-abuse-${runId}@example.com`,
      password: "E2e-password-123",
      email_confirm: true,
    });

  expect(ownerError).toBeNull();
  const ownerId = ownerData.user!.id;
  const subjectHash = createHash("sha256").update(runId).digest("hex");

  try {
    const rateResults = await Promise.all(
      Array.from({ length: 3 }, () =>
        supabase.rpc("consume_api_rate_limit", {
          p_action: "abuse-check",
          p_limit: 2,
          p_subject_hash: subjectHash,
          p_window_seconds: 60,
        }),
      ),
    );

    expect(rateResults.every(({ error }) => error === null)).toBe(true);
    expect(
      rateResults.filter(({ data }) => data?.[0]?.allowed === true),
    ).toHaveLength(2);
    expect(
      rateResults.filter(({ data }) => data?.[0]?.allowed === false),
    ).toHaveLength(1);

    const reservationAttempts = Array.from({ length: 6 }, (_, index) => {
      const fileId = randomUUID();

      return {
        fileId,
        result: supabase.rpc("reserve_file_upload", {
          p_declared_mime: "application/pdf",
          p_declared_size_bytes: 1,
          p_id: fileId,
          p_object_path: `${ownerId}/${fileId}`,
          p_original_name: `pending-${index}.pdf`,
          p_owner_id: ownerId,
        }),
      };
    });
    const reservationResults = await Promise.all(
      reservationAttempts.map(async ({ fileId, result }) => ({
        fileId,
        response: await result,
      })),
    );
    const successfulReservations = reservationResults.filter(
      ({ response }) => response.error === null,
    );
    const rejectedReservations = reservationResults.filter(
      ({ response }) => response.error !== null,
    );

    expect(successfulReservations).toHaveLength(5);
    expect(rejectedReservations).toHaveLength(1);
    expect(rejectedReservations[0]?.response.error?.message).toContain(
      "pending_upload_limit",
    );

    const { error: pendingDeleteError } = await supabase
      .from("files")
      .delete()
      .in(
        "id",
        successfulReservations.map(({ fileId }) => fileId),
      );
    expect(pendingDeleteError).toBeNull();

    const readyRows = Array.from({ length: 40 }, (_, index) => {
      const fileId = randomUUID();

      return {
        id: fileId,
        owner_id: ownerId,
        object_path: `${ownerId}/${fileId}`,
        original_name: `ready-${index}.pdf`,
        declared_mime: "application/pdf",
        declared_size_bytes: MAX_FILE_SIZE_BYTES,
        size_bytes: MAX_FILE_SIZE_BYTES,
        content_type: "application/pdf",
        status: "ready",
        finalized_at: new Date().toISOString(),
      };
    });
    const { error: readyInsertError } = await supabase
      .from("files")
      .insert(readyRows);
    expect(readyInsertError).toBeNull();

    const quotaId = randomUUID();
    const { error: quotaError } = await supabase.rpc("reserve_file_upload", {
      p_declared_mime: "application/pdf",
      p_declared_size_bytes: MAX_FILE_SIZE_BYTES,
      p_id: quotaId,
      p_object_path: `${ownerId}/${quotaId}`,
      p_original_name: "quota.pdf",
      p_owner_id: ownerId,
    });
    expect(quotaError?.message).toContain("storage_quota_exceeded");
  } finally {
    await supabase
      .from("api_rate_limits")
      .delete()
      .eq("subject_hash", subjectHash);
    await supabase.auth.admin.deleteUser(ownerId);
  }
});
