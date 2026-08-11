import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  createSignedDownload: vi.fn(),
  findVisibleReadyFileRow: vi.fn(),
}));

vi.mock("@/server/infrastructure/supabase/storage.repository", () => ({
  createSignedDownload: mocks.createSignedDownload,
}));

vi.mock("@/server/modules/files/file.repository", () => ({
  findVisibleReadyFileRow: mocks.findVisibleReadyFileRow,
}));

import { prepareFileDownload } from "@/server/modules/files/create-download.service";

describe("prepareFileDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findVisibleReadyFileRow.mockResolvedValue({
      object_path: "owner-id/file-id",
      original_name: "report/quarter\n1.pdf",
    });
    mocks.createSignedDownload.mockResolvedValue({
      signedUrl: "https://storage.example.test/signed",
      expiresIn: 60,
    });
  });

  it("checks file visibility before signing a sanitized download name", async () => {
    const result = await prepareFileDownload("file-id");

    expect(mocks.findVisibleReadyFileRow).toHaveBeenCalledWith("file-id");
    expect(mocks.createSignedDownload).toHaveBeenCalledWith(
      "owner-id/file-id",
      "report_quarter_1.pdf",
    );
    expect(result.expiresIn).toBe(60);
  });
});
