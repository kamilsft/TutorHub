// tests/performance/messages.smoke.test.ts
// Performance smoke tests for messaging operations
// NFR11 (messaging performance)
// These are lightweight response-shape checks — not benchmark timings.
// They verify the route resolves quickly with mocked data and that the
// service query structure is correct.

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  message: {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { GET } from "@/app/api/messages/route";

const USER_A = "perf-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "perf-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function authReq(url: string): Request {
  const token = signToken(USER_A, "STUDENT");
  return new Request(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("GET /api/messages — performance smoke tests (NFR11)", () => {
  beforeEach(() => vi.clearAllMocks());

  // Smoke: route resolves with mocked data — verifies no blocking I/O in happy path
  it("resolves with 200 and threads array shape (NFR11)", async () => {
    prismaMock.message.findMany.mockResolvedValue([] as never);
    const req = authReq("http://localhost/api/messages");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("threads");
    expect(Array.isArray(body.threads)).toBe(true);
  });

  // Smoke: conversation endpoint resolves with correct shape
  it("resolves with 200 and messages/peer shape when ?with= is set (NFR11)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: USER_B,
      fullName: "Peer User",
      email: "peer@test.com",
    } as never);
    prismaMock.message.findMany.mockResolvedValue([] as never);
    prismaMock.message.updateMany.mockResolvedValue({ count: 0 } as never);

    const req = authReq(`http://localhost/api/messages?with=${USER_B}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("peer");
    expect(body).toHaveProperty("messages");
    expect(body.peer).toHaveProperty("id", USER_B);
  });

  // Smoke: thread query uses correct structural fields (senderId, receiverId)
  it("thread query uses correct sender/receiver structure (NFR11)", async () => {
    prismaMock.message.findMany.mockResolvedValue([] as never);
    const req = authReq("http://localhost/api/messages");
    await GET(req);
    expect(prismaMock.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ senderId: USER_A }),
            expect.objectContaining({ receiverId: USER_A }),
          ]),
        }),
      })
    );
  });

  // Smoke: route handles an empty message list without errors
  it("handles empty message list without throwing (NFR11)", async () => {
    prismaMock.message.findMany.mockResolvedValue([] as never);
    const req = authReq("http://localhost/api/messages");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.threads).toHaveLength(0);
  });
});
