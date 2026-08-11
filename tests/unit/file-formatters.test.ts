import { describe, expect, it } from "vitest";

import { formatFileSize } from "@/client/entities/file/file.formatters";

describe("file formatters", () => {
  it.each([
    [null, "—"],
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1.0 KB"],
    [25 * 1024 * 1024, "25 MB"],
  ])("formats %s bytes", (input, expected) => {
    expect(formatFileSize(input)).toBe(expected);
  });
});
