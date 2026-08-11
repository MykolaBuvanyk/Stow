import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { toFileDto } from "@/server/modules/files/file.mapper";
import type { Tables } from "@/server/infrastructure/supabase/database.types";

const ownerId = "6bc76079-1129-4a2d-87d8-48f063ef19e0";

const fileRow: Tables<"files"> = {
  cleanup_claimed_at: null,
  content_type: "application/pdf",
  created_at: "2026-08-11T12:00:00.000Z",
  declared_mime: "application/pdf",
  declared_size_bytes: 1024,
  deleted_at: null,
  finalized_at: "2026-08-11T12:01:00.000Z",
  id: "f3676493-0e1d-43bb-97dc-fbd825a3b4c7",
  object_path: `${ownerId}/f3676493-0e1d-43bb-97dc-fbd825a3b4c7`,
  original_name: "document.pdf",
  owner_id: ownerId,
  size_bytes: 1024,
  status: "ready",
};

describe("file mapper", () => {
  it("maps database naming to a public owner DTO", () => {
    expect(toFileDto(fileRow, ownerId)).toEqual({
      access: "owner",
      contentType: "application/pdf",
      createdAt: "2026-08-11T12:00:00.000Z",
      finalizedAt: "2026-08-11T12:01:00.000Z",
      id: "f3676493-0e1d-43bb-97dc-fbd825a3b4c7",
      originalName: "document.pdf",
      sizeBytes: 1024,
      status: "ready",
    });
  });

  it("marks files owned by another user as shared", () => {
    const dto = toFileDto(
      fileRow,
      "c64a88f8-217c-45ad-9e7f-2adf381466d8",
    );

    expect(dto.access).toBe("shared");
    expect(dto).not.toHaveProperty("ownerId");
    expect(dto).not.toHaveProperty("objectPath");
  });
});
