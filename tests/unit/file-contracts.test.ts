import { describe, expect, it } from "vitest";

import {
  fileSchema,
  listFilesQuerySchema,
} from "@/contracts/file.contracts";

describe("file contracts", () => {
  it("applies bounded list defaults", () => {
    expect(listFilesQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 25,
    });
  });

  it("coerces valid query-string pagination", () => {
    expect(
      listFilesQuerySchema.parse({ page: "2", pageSize: "10" }),
    ).toEqual({ page: 2, pageSize: 10 });
  });

  it("rejects page sizes above the API limit", () => {
    expect(
      listFilesQuerySchema.safeParse({ page: 1, pageSize: 51 }).success,
    ).toBe(false);
  });

  it("does not accept unknown file statuses", () => {
    const result = fileSchema.safeParse({
      access: "owner",
      contentType: null,
      createdAt: "2026-08-11T12:00:00.000Z",
      finalizedAt: null,
      id: "f3676493-0e1d-43bb-97dc-fbd825a3b4c7",
      originalName: "document.pdf",
      sizeBytes: null,
      status: "deleted",
    });

    expect(result.success).toBe(false);
  });
});
