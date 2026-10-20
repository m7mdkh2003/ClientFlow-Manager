import { expect, it, vi } from "vitest";
import request from "supertest";

const { clerkTestAuth } = vi.hoisted(() => ({
  clerkTestAuth: { userId: null as string | null },
}));

vi.mock("@clerk/express", () => ({
  getAuth: () => ({ userId: clerkTestAuth.userId }),
  clerkMiddleware: () =>
    (_req: unknown, _res: unknown, next: (error?: unknown) => void) => next(),
}));

import app from "./app";

it("returns only the authenticated Clerk user ID and rejects signed-out requests", async () => {
  clerkTestAuth.userId = null;
  await request(app).get("/api/auth/me").expect(401);

  const expectedUserId = "user_identity_check";
  clerkTestAuth.userId = expectedUserId;
  const response = await request(app).get("/api/auth/me").expect(200);

  expect(response.body).toEqual({ userId: expectedUserId });
  expect(response.headers["cache-control"]).toBe("no-store");
});
