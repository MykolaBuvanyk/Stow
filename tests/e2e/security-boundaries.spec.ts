import { expect, test } from "@playwright/test";

const fileId = "11111111-1111-4111-8111-111111111111";
const shareId = "22222222-2222-4222-8222-222222222222";
const sameOriginHeaders = {
  Origin: "http://localhost:3000",
  "X-Stow-Request": "1",
};

test("protected API routes reject unauthenticated direct requests", async ({
  request,
}) => {
  const requests = [
    request.get("/api/files"),
    request.get(`/api/files/${fileId}/download`),
    request.get(`/api/files/${fileId}/shares`),
    request.post("/api/uploads", {
      data: {
        originalName: "test.pdf",
        declaredMime: "application/pdf",
        declaredSize: 10,
      },
      headers: sameOriginHeaders,
    }),
    request.post(`/api/uploads/${fileId}/finalize`, {
      headers: sameOriginHeaders,
    }),
    request.delete(`/api/files/${fileId}`, { headers: sameOriginHeaders }),
    request.post(`/api/files/${fileId}/shares`, {
      data: { email: "recipient@example.com" },
      headers: sameOriginHeaders,
    }),
    request.delete(`/api/files/${fileId}/shares/${shareId}`, {
      headers: sameOriginHeaders,
    }),
  ];

  for (const response of await Promise.all(requests)) {
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  }
});

test("mutation routes reject missing or foreign request provenance", async ({
  request,
}) => {
  const missingOrigin = await request.post("/api/uploads", {
    data: {},
    headers: { "X-Stow-Request": "1" },
  });
  expect(missingOrigin.status()).toBe(403);

  const missingMarker = await request.post("/api/uploads", {
    data: {},
    headers: { Origin: "http://localhost:3000" },
  });
  expect(missingMarker.status()).toBe(403);

  const foreignOrigin = await request.post("/api/uploads", {
    data: {},
    headers: {
      Origin: "https://attacker.example",
      "Sec-Fetch-Site": "cross-site",
      "X-Stow-Request": "1",
    },
  });
  expect(foreignOrigin.status()).toBe(403);
});

test("the app shell returns the browser security baseline", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("script-src");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
});
