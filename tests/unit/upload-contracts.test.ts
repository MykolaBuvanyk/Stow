import { describe, expect, it } from "vitest";

import { MAX_FILE_SIZE_BYTES } from "@/config/file-policy";
import {
  finalizeUploadResponseSchema,
  reserveUploadRequestSchema,
} from "@/contracts/upload.contracts";

describe("reserveUploadRequestSchema", () => {
  it("accepts supported metadata and trims the display name", () => {
    const result = reserveUploadRequestSchema.parse({
      originalName: "  report.PDF  ",
      declaredMime: "application/pdf",
      declaredSize: 1024,
    });

    expect(result.originalName).toBe("report.PDF");
  });

  it("rejects a MIME and extension mismatch", () => {
    const result = reserveUploadRequestSchema.safeParse({
      originalName: "photo.png",
      declaredMime: "image/jpeg",
      declaredSize: 1024,
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty and oversized files", () => {
    for (const declaredSize of [0, MAX_FILE_SIZE_BYTES + 1]) {
      expect(
        reserveUploadRequestSchema.safeParse({
          originalName: "report.pdf",
          declaredMime: "application/pdf",
          declaredSize,
        }).success,
      ).toBe(false);
    }
  });

  it("rejects unexpected request properties", () => {
    const result = reserveUploadRequestSchema.safeParse({
      originalName: "report.pdf",
      declaredMime: "application/pdf",
      declaredSize: 1024,
      ownerId: "spoofed-owner",
    });

    expect(result.success).toBe(false);
  });
});

describe("finalizeUploadResponseSchema", () => {
  it("does not expose the internal storage path", () => {
    const result = finalizeUploadResponseSchema.parse({
      file: {
        access: "owner",
        contentType: "application/pdf",
        createdAt: "2026-08-11T12:00:00.000Z",
        finalizedAt: "2026-08-11T12:01:00.000Z",
        id: "11111111-1111-4111-8111-111111111111",
        originalName: "report.pdf",
        sizeBytes: 1024,
        status: "ready",
      },
    });

    expect(result.file).not.toHaveProperty("objectPath");
  });
});
