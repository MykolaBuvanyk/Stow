import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  runMaintenanceSweep: vi.fn(),
}));

vi.mock("@/config/server-env", () => ({
  serverEnv: {
    CRON_SECRET: "test-cron-secret-that-is-at-least-32-characters",
  },
}));

vi.mock(
  "@/server/modules/maintenance/run-maintenance-sweep.service",
  () => ({
    runMaintenanceSweep: mocks.runMaintenanceSweep,
  }),
);

import { GET } from "@/app/api/maintenance/sweep/route";

const secret = "test-cron-secret-that-is-at-least-32-characters";

describe("maintenance sweep route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runMaintenanceSweep.mockResolvedValue({
      claimed: 2,
      deleted: 2,
      failed: 0,
    });
  });

  it("rejects requests without the cron Bearer token", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/maintenance/sweep"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.runMaintenanceSweep).not.toHaveBeenCalled();
  });

  it("runs the sweep for an exact cron Bearer token", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/maintenance/sweep", {
        headers: { authorization: `Bearer ${secret}` },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      claimed: 2,
      deleted: 2,
      failed: 0,
    });
    expect(mocks.runMaintenanceSweep).toHaveBeenCalledOnce();
  });

  it("returns a failing status when any cleanup needs another retry", async () => {
    mocks.runMaintenanceSweep.mockResolvedValue({
      claimed: 2,
      deleted: 1,
      failed: 1,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/maintenance/sweep", {
        headers: { authorization: `Bearer ${secret}` },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      claimed: 2,
      deleted: 1,
      failed: 1,
    });
  });
});
