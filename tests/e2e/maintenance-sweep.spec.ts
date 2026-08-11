import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("maintenance endpoint cleans stale states and preserves recent uploads", async ({
  request,
}) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET ?? process.env.SWEEP_SECRET;

  expect(supabaseUrl).toBeTruthy();
  expect(serviceRoleKey).toBeTruthy();
  expect(cronSecret).toBeTruthy();

  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const runId = Date.now();
  const { data: ownerData, error: ownerError } =
    await supabase.auth.admin.createUser({
      email: `stow-e2e-sweep-owner-${runId}@example.com`,
      password: "E2e-password-123",
      email_confirm: true,
    });
  const { data: granteeData, error: granteeError } =
    await supabase.auth.admin.createUser({
      email: `stow-e2e-sweep-grantee-${runId}@example.com`,
      password: "E2e-password-123",
      email_confirm: true,
    });

  expect(ownerError).toBeNull();
  expect(granteeError).toBeNull();
  const ownerId = ownerData.user!.id;
  const granteeId = granteeData.user!.id;
  const stalePendingId = randomUUID();
  const rejectedId = randomUUID();
  const deletedId = randomUUID();
  const recentPendingId = randomUUID();
  const cleanupFileIds = [stalePendingId, rejectedId, deletedId];
  const cleanupObjectPaths = cleanupFileIds.map((fileId) => `${ownerId}/${fileId}`);
  const oldCreatedAt = new Date(Date.now() - 2 * 60 * 60 * 1_000).toISOString();
  const oldDeletedAt = new Date(Date.now() - 10 * 60 * 1_000).toISOString();
  const now = new Date().toISOString();

  try {
    const { error: insertError } = await supabase.from("files").insert([
      {
        id: stalePendingId,
        owner_id: ownerId,
        object_path: `${ownerId}/${stalePendingId}`,
        original_name: "stale.pdf",
        declared_mime: "application/pdf",
        declared_size_bytes: 14,
        status: "pending",
        created_at: oldCreatedAt,
        deleted_at: null,
        finalized_at: null,
        size_bytes: null,
        content_type: null,
      },
      {
        id: rejectedId,
        owner_id: ownerId,
        object_path: `${ownerId}/${rejectedId}`,
        original_name: "rejected.pdf",
        declared_mime: "application/pdf",
        declared_size_bytes: 14,
        status: "rejected",
        created_at: oldCreatedAt,
        deleted_at: null,
        finalized_at: null,
        size_bytes: null,
        content_type: null,
      },
      {
        id: deletedId,
        owner_id: ownerId,
        object_path: `${ownerId}/${deletedId}`,
        original_name: "deleted.pdf",
        declared_mime: "application/pdf",
        declared_size_bytes: 14,
        status: "ready",
        created_at: oldCreatedAt,
        deleted_at: null,
        finalized_at: oldDeletedAt,
        size_bytes: 14,
        content_type: "application/pdf",
      },
      {
        id: recentPendingId,
        owner_id: ownerId,
        object_path: `${ownerId}/${recentPendingId}`,
        original_name: "recent.pdf",
        declared_mime: "application/pdf",
        declared_size_bytes: 14,
        status: "pending",
        created_at: now,
        deleted_at: null,
        finalized_at: null,
        size_bytes: null,
        content_type: null,
      },
    ]);
    expect(insertError).toBeNull();

    const { error: shareError } = await supabase.from("file_shares").insert({
      file_id: deletedId,
      grantee_id: granteeId,
    });
    expect(shareError).toBeNull();

    const { error: tombstoneError } = await supabase
      .from("files")
      .update({ deleted_at: oldDeletedAt })
      .eq("id", deletedId);
    expect(tombstoneError).toBeNull();

    for (const objectPath of cleanupObjectPaths) {
      const { error: uploadError } = await supabase.storage
        .from("vault")
        .upload(objectPath, Buffer.from("%PDF-1.4\n%%EOF"), {
          contentType: "application/pdf",
        });
      expect(uploadError).toBeNull();
    }

    const unauthorized = await request.get("/api/maintenance/sweep");
    expect(unauthorized.status()).toBe(401);

    const response = await request.get("/api/maintenance/sweep", {
      headers: { authorization: `Bearer ${cronSecret}` },
    });
    expect(response.ok()).toBeTruthy();

    const { data: rows, error: readError } = await supabase
      .from("files")
      .select("id")
      .in("id", [...cleanupFileIds, recentPendingId]);
    expect(readError).toBeNull();
    expect(rows).toEqual([{ id: recentPendingId }]);

    const { count: shareCount, error: shareReadError } = await supabase
      .from("file_shares")
      .select("*", { count: "exact", head: true })
      .eq("file_id", deletedId);
    expect(shareReadError).toBeNull();
    expect(shareCount).toBe(0);

    for (const objectPath of cleanupObjectPaths) {
      const { data: object } = await supabase.storage
        .from("vault")
        .info(objectPath);
      expect(object).toBeNull();
    }
  } finally {
    await supabase.storage.from("vault").remove(cleanupObjectPaths);
    await supabase.auth.admin.deleteUser(ownerId);
    await supabase.auth.admin.deleteUser(granteeId);
  }
});
