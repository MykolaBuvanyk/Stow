import "server-only";

export function privateJson<T>(data: T, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");

  return Response.json(data, {
    ...init,
    headers,
  });
}

export function privateNoContent(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
