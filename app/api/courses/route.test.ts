import { beforeEach, describe, expect, it, vi } from "vitest";

// ── mock jwt so we can control auth ──────────────────────────────────────────
vi.mock("@/lib/jwt", () => ({
  verifyToken: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET, POST, PATCH, DELETE } from "./route";

const mockTutorPayload = { sub: "tutor-1", role: "TUTOR" };
const mockStudentPayload = { sub: "student-1", role: "STUDENT" };

function makeRequest(
  method: string,
  url: string,
  body?: object,
  token?: string
): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── GET (public) ──────────────────────────────────────────────────────────
  describe("GET", () => {
    it("returns published courses without auth", async () => {
      prismaMock.course.findMany.mockResolvedValue([{ id: 1, title: "Math" }] as never);
      const req = new Request("http://localhost/api/courses");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isPublished: true }) })
      );
    });

    it("filters by subject when query param set", async () => {
      prismaMock.course.findMany.mockResolvedValue([]);
      const req = new Request("http://localhost/api/courses?subject=Physics");
      await GET(req);
      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subject: "Physics", isPublished: true }),
        })
      );
    });
  });

  // ── POST ─────────────────────────────────────────────────────────────────
  describe("POST", () => {
    it("returns 401 when no token provided", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const req = makeRequest("POST", "http://localhost/api/courses", {
        title: "Calc",
        subject: "Math",
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when user is a STUDENT", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
      const req = makeRequest(
        "POST",
        "http://localhost/api/courses",
        { title: "Calc", subject: "Math" },
        "student-token"
      );
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 when title is missing", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockTutorPayload as any);
      const req = makeRequest(
        "POST",
        "http://localhost/api/courses",
        { subject: "Math" },
        "tutor-token"
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates course using authenticated tutor identity (ignores any body tutorId)", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockTutorPayload as any);
      prismaMock.course.create.mockResolvedValue({
        id: 5,
        title: "Calc",
        subject: "Math",
        tutorId: "tutor-1",
      } as never);

      const req = makeRequest(
        "POST",
        "http://localhost/api/courses",
        { title: "Calc", subject: "Math", tutorId: "injected-id" }, // tutorId in body must be ignored
        "tutor-token"
      );
      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(prismaMock.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tutorId: "tutor-1" }),
        })
      );
    });
  });

  // ── PATCH ─────────────────────────────────────────────────────────────────
  describe("PATCH", () => {
    it("returns 403 when tutor does not own the course", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockTutorPayload as any);
      prismaMock.course.findUnique.mockResolvedValue({ id: 1, tutorId: "other-tutor" } as never);

      const req = makeRequest(
        "PATCH",
        "http://localhost/api/courses?id=1",
        { title: "New" },
        "tutor-token"
      );
      const res = await PATCH(req);
      expect(res.status).toBe(403);
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  describe("DELETE", () => {
    it("returns 403 when tutor does not own the course", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockTutorPayload as any);
      prismaMock.course.findUnique.mockResolvedValue({ id: 1, tutorId: "other-tutor" } as never);

      const req = makeRequest("DELETE", "http://localhost/api/courses?id=1", undefined, "tutor-token");
      const res = await DELETE(req);
      expect(res.status).toBe(403);
    });

    it("deletes course owned by the authenticated tutor", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockTutorPayload as any);
      prismaMock.course.findUnique.mockResolvedValue({ id: 1, tutorId: "tutor-1" } as never);
      prismaMock.course.delete.mockResolvedValue({ id: 1 } as never);

      const req = makeRequest("DELETE", "http://localhost/api/courses?id=1", undefined, "tutor-token");
      const res = await DELETE(req);
      expect(res.status).toBe(200);
    });

    it("returns 500 on unexpected DELETE error", async () => {
      vi.mocked(verifyToken).mockReturnValue({ sub: "tutor-1", role: "TUTOR" } as any);
      prismaMock.course.findUnique.mockRejectedValue(new Error("DB down") as never);
      const res = await DELETE(makeRequest("DELETE", "http://localhost/api/courses?id=1", undefined, "tutor-token"));
      expect(res.status).toBe(500);
    });
  });

  describe("POST /api/courses — 500 error path", () => {
    it("returns 500 on unexpected POST error", async () => {
      vi.mocked(verifyToken).mockReturnValue({ sub: "tutor-1", role: "TUTOR" } as any);
      prismaMock.course.create.mockRejectedValue(new Error("DB down") as never);
      const res = await POST(makeRequest("POST", "http://localhost/api/courses", { title: "T", subject: "S" }, "tutor-token"));
      expect(res.status).toBe(500);
    });
  });

  describe("PATCH /api/courses — 500 error path", () => {
    it("returns 500 on unexpected PATCH error", async () => {
      vi.mocked(verifyToken).mockReturnValue({ sub: "tutor-1", role: "TUTOR" } as any);
      prismaMock.course.findUnique.mockRejectedValue(new Error("DB down") as never);
      const res = await PATCH(makeRequest("PATCH", "http://localhost/api/courses?id=1", { title: "T", subject: "S" }, "tutor-token"));
      expect(res.status).toBe(500);
    });
  });
});
