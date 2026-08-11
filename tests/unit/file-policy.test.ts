import { describe, expect, it } from "vitest";

import {
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  FILE_SIGNATURE_READ_BYTES,
  MAX_FILE_SIZE_BYTES,
  SIGNED_DOWNLOAD_TTL_SECONDS,
} from "@/config/file-policy";

describe("file policy", () => {
  it("limits uploads to 25 MiB", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(25 * 1024 * 1024);
  });

  it("allows only the file types required by Stow", () => {
    expect(ALLOWED_MIME_TYPES).toEqual([
      "application/pdf",
      "image/jpeg",
      "image/png",
    ]);
    expect(ALLOWED_FILE_EXTENSIONS).toEqual(["pdf", "jpg", "jpeg", "png"]);
  });

  it("keeps signature reads and download links bounded", () => {
    expect(FILE_SIGNATURE_READ_BYTES).toBe(8 * 1024);
    expect(SIGNED_DOWNLOAD_TTL_SECONDS).toBe(60);
  });
});
