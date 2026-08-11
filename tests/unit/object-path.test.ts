import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildObjectPath } from "@/server/modules/uploads/object-path";

describe("buildObjectPath", () => {
  const ownerId = "11111111-1111-4111-8111-111111111111";
  const fileId = "22222222-2222-4222-8222-222222222222";

  it("uses only the owner and server-generated file ids", () => {
    expect(buildObjectPath(ownerId, fileId)).toBe(`${ownerId}/${fileId}`);
  });

  it("rejects invalid identifiers", () => {
    expect(() => buildObjectPath("../someone", fileId)).toThrow();
    expect(() => buildObjectPath(ownerId, "report.pdf")).toThrow();
  });
});
