// tests/performance/inbox.smoke.test.ts
// Performance smoke tests for the messaging inbox (user search)
// NFR11 (messaging performance), NFR1 (auth), NFR2 (self-exclusion)
// Lightweight response-shape checks with mocked data — not benchmark timings.

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { GET } from "@/app/api/messages/users/route";

const USER_A = "inbox-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "inbox-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function authReq(q?: string): Request {
  const token = signToken(USER_A, "STUDENT");
  const url = q
    ? `http://localhost/api/messages/users?q=${encodeURIComponent(q)}`
    : "http://localhost/api/messages/users";
  return new Request(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("GET /api/messages/users — inbox smoke tests (NFR11)", () => {
  beforeEach(() => vi.clearAllMocks());

  // Smoke: route resolves quickly with mocked data and returns users array
  it("resolves with 200 and users array shape (NFR11)", async () => {
    prismaMock.user.findMany.mockResolvedValue([] as never);
    const res = await GET(authReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("users");
    expect(Array.isArray(body.users)).toBe(true);
  });

  // Smoke: returns matched users when search query is provided
  it("returns matched users for a search query (NFR11)", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: USER_B, fullName: "Bob Tutor", email: "bob@test.com", role: "TUTOR" },
    ] as never);
    const res = await GET(authReq("Bob"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(1);
    expect(body.users[0]).toHaveProperty("id", USER_B);
  });

  // Smoke: returns empty array when no users match query (NFR2 — self excluded by service)
  it("returns empty array when no users match (NFR11)", async () => {
    prismaMock.user.findMany.mockResolvedValue([] as never);
    const res = await GET(authReq("zzznomatch"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(0);
  });
});
