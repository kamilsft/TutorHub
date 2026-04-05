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
import { GET, POST } from "./route";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function authReq(url: string, init?: RequestInit) {
  const token = signToken(USER_A, "STUDENT");
  return new Request(url, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init?.headers).entries()),
      authorization: `Bearer ${token}`,
    },
  });
}

describe("/api/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns threads for authenticated user", async () => {
      prismaMock.message.findMany.mockResolvedValue([] as never);
      const req = authReq("http://localhost/api/messages");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.threads).toEqual([]);
    });

    it("returns 400 when messaging yourself", async () => {
      const req = authReq(`http://localhost/api/messages?with=${USER_A}`);
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("returns conversation with peer when with= set", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: USER_B,
        fullName: "Peer",
        email: "p@test.com",
      } as never);
      prismaMock.message.findMany.mockResolvedValue([] as never);

      const req = authReq(`http://localhost/api/messages?with=${USER_B}`);
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("returns 400 without receiverId", async () => {
      const req = authReq("http://localhost/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "hi" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when messaging yourself", async () => {
      const req = authReq("http://localhost/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: USER_A, content: "hi" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("sends message when receiver exists", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: USER_B,
        fullName: "B",
        email: "b@test.com",
      } as never);
      prismaMock.message.create.mockResolvedValue({
        id: "m1",
        content: "Hello",
        senderId: USER_A,
        receiverId: USER_B,
        isRead: false,
        createdAt: new Date(),
      } as never);

      const req = authReq("http://localhost/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: USER_B, content: "Hello" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message.content).toBe("Hello");
    });

    it("returns 500 on unexpected POST error", async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error("DB down") as never);
      const token = signToken("user-a", "STUDENT");
      const res = await POST(new Request("http://localhost/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: "user-b", content: "Hi" }),
      }));
      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/messages — 500 error path", () => {
    it("returns 500 on unexpected GET error", async () => {
      const token = signToken("user-a", "STUDENT");
      prismaMock.message.findMany.mockRejectedValue(new Error("DB down") as never);
      const res = await GET(new Request("http://localhost/api/messages", {
        headers: { Authorization: `Bearer ${token}` },
      }));
      expect(res.status).toBe(500);
    });
  });
});
