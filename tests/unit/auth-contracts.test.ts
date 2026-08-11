import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/contracts/auth.contracts";

describe("auth contracts", () => {
  it("normalizes a valid login email", () => {
    const result = loginSchema.parse({
      email: "  user@example.com  ",
      password: "secret",
    });

    expect(result.email).toBe("user@example.com");
  });

  it("rejects malformed email addresses", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });

    expect(result.success).toBe(false);
  });

  it("requires a registration password of at least eight characters", () => {
    const result = registerSchema.safeParse({
      confirmPassword: "short",
      email: "user@example.com",
      password: "short",
    });

    expect(result.success).toBe(false);
  });

  it("requires matching registration passwords", () => {
    const result = registerSchema.safeParse({
      confirmPassword: "different-password",
      email: "user@example.com",
      password: "secure-password",
    });

    expect(result.success).toBe(false);
  });
});
