// tests/integration/messages.integration.test.ts
// Integration tests for the messaging system
// FR10 and FR11 (messaging), NFR1 (auth), NFR4 (validation)

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  user:    { findUnique: vi.fn(), findMany: vi.fn() },
  message: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET, POST } from "@/app/api/messages/route";
import { GET as searchUsers } from "@/app/api/messages/users/route";

const USER_A = "aaaa-aaaa";
const USER_B = "bbbb-bbbb";
const payloadA = { sub: USER_A, role: "STUDENT" };

function req(method: string, url: string, body?: object): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Messages integration (FR10 + FR11 + NFR1 + NFR4)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── GET threads ───────────────────────────────────────────────────────────
  describe("GET /api/messages — thread list (FR10)", () => {
    it("returns 401 when unauthenticated (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await GET(new Request("http://localhost/api/messages"));
      expect(res.status).toBe(401);
    });

    it("returns thread list for the authenticated user (FR10)", async () => {
      vi.mocked(verifyToken).mockReturnValue(payloadA as any);
      prismaMock.message.findMany.mockResolvedValue([]);

      const res = await GET(req("GET", "http://localhost/api/messages"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("threads");
    });

    it("returns 400 when user tries to open a conversation with themselves (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(payloadA as any);
      const res = await GET(req("GET", `http://localhost/api/messages?with=${USER_A}`));
      expect(res.status).toBe(400);
    });

    it("returns conversation with peer and marks messages as read (FR10)", async () => {
      vi.mocked(verifyToken).mockReturnValue(payloadA as any);
      prismaMock.user.findUnique.mockResolvedValue({ id: USER_B, fullName: "Bob", email: "b@test.com" });
      prismaMock.message.findMany.mockResolvedValue([]);
      prismaMock.message.updateMany.mockResolvedValue({ count: 0 });

      const res = await GET(req("GET", `http://localhost/api/messages?with=${USER_B}`));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.peer.id).toBe(USER_B);
      expect(body.messages).toEqual([]);
      // must mark thread as read
      expect(prismaMock.message.updateMany).toHaveBeenCalled();
    });
  });

  // ── POST message ──────────────────────────────────────────────────────────
  describe("POST /api/messages — send message (FR11 + NFR4)", () => {
    it("sends a message between two users (FR11)", async () => {
      vi.mocked(verifyToken).mockReturnValue(payloadA as any);
      prismaMock.user.findUnique.mockResolvedValue({ id: USER_B });
      prismaMock.message.create.mockResolvedValue({
        id: "msg-1", content: "Hello!", senderId: USER_A, receiverId: USER_B,
        isRead: false, createdAt: new Date(),
        sender: {}, receiver: {},
      });

      const res = await POST(req("POST", "http://localhost/api/messages", {
        receiverId: USER_B, content: "Hello!",
      }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message.content).toBe("Hello!");
    });

    it("returns 400 when trying to message yourself (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(payloadA as any);
      const res = await POST(req("POST", "http://localhost/api/messages", {
        receiverId: USER_A, content: "Hello me",
      }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when content is empty (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(payloadA as any);
      const res = await POST(req("POST", "http://localhost/api/messages", {
        receiverId: USER_B, content: "",
      }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when receiverId is missing (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(payloadA as any);
      const res = await POST(req("POST", "http://localhost/api/messages", { content: "Hi" }));
      expect(res.status).toBe(400);
    });

    it("returns 404 when receiver does not exist", async () => {
      vi.mocked(verifyToken).mockReturnValue(payloadA as any);
      prismaMock.user.findUnique.mockResolvedValue(null);
      const res = await POST(req("POST", "http://localhost/api/messages", {
        receiverId: "ghost-user", content: "Hello?",
      }));
      expect(res.status).toBe(404);
    });

    it("returns 401 when unauthenticated (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await POST(new Request("http://localhost/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: USER_B, content: "Hi" }),
      }));
      expect(res.status).toBe(401);
    });

    it("returns 400 when content exceeds 8000 characters (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(payloadA as any);
      const res = await POST(req("POST", "http://localhost/api/messages", {
        receiverId: USER_B, content: "a".repeat(8001),
      }));
      expect(res.status).toBe(400);
    });
  });

  // ── User search (FR10) ─────────────────────────────────────────────────────
  describe("GET /api/messages/users — user search (FR10)", () => {
    it("returns 401 when unauthenticated (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await searchUsers(new Request("http://localhost/api/messages/users"));
      expect(res.status).toBe(401);
    });

    it("returns matching users excluding the caller (NFR2 — can't message yourself)", async () => {
      vi.mocked(verifyToken).mockReturnValue(payloadA as any);
      prismaMock.user.findMany.mockResolvedValue([{ id: USER_B, fullName: "Bob", role: "TUTOR" }]);

      const res = await searchUsers(req("GET", "http://localhost/api/messages/users?q=bob"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.users).toHaveLength(1);
      // search query must exclude the calling user's own ID
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { not: USER_A } }) })
      );
    });
  });
});
