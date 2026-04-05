// tests/integration/assignments.integration.test.ts
// Integration tests for assignment creation and retrieval
// FR7 (create/view assignments), FR9-related access context, NFR1, NFR2, NFR4

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  assignment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  course:     { findUnique: vi.fn() },
  enrollment: { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET, POST }  from "@/app/api/assignments/route";
import { GET as getOne } from "@/app/api/assignments/[id]/route";

const student = { sub: "student-1", role: "STUDENT" };
const tutor   = { sub: "tutor-1",   role: "TUTOR"   };

function req(method: string, url: string, body?: object, payload?: typeof student): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (payload) headers["Authorization"] = "Bearer token";
  return new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

describe("Assignments integration (FR7 + NFR1 + NFR2)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── GET assignments list (FR7) ────────────────────────────────────────────
  describe("GET /api/assignments", () => {
    it("returns 401 when unauthenticated (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await GET(new Request("http://localhost/api/assignments?courseId=1"));
      expect(res.status).toBe(401);
    });

    it("returns 400 when courseId is missing (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      const res = await GET(req("GET", "http://localhost/api/assignments", undefined, tutor));
      expect(res.status).toBe(400);
    });

    it("tutor sees assignments for their own course (FR7 + NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: "tutor-1" });
      prismaMock.assignment.findMany.mockResolvedValue([{ id: 1, title: "HW1" }]);

      const res = await GET(req("GET", "http://localhost/api/assignments?courseId=1", undefined, tutor));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
    });

    it("returns 403 when tutor tries to access another tutor's course (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: "different-tutor" });

      const res = await GET(req("GET", "http://localhost/api/assignments?courseId=1", undefined, tutor));
      expect(res.status).toBe(403);
    });

    it("student sees assignments when enrolled (FR7 + NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" });
      prismaMock.assignment.findMany.mockResolvedValue([{ id: 1, title: "HW1" }]);

      const res = await GET(req("GET", "http://localhost/api/assignments?courseId=1", undefined, student));
      expect(res.status).toBe(200);
    });

    it("returns 403 when student is not enrolled (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.enrollment.findUnique.mockResolvedValue(null);

      const res = await GET(req("GET", "http://localhost/api/assignments?courseId=1", undefined, student));
      expect(res.status).toBe(403);
    });
  });

  // ── POST assignment (FR7) ─────────────────────────────────────────────────
  describe("POST /api/assignments", () => {
    it("tutor creates assignment for their own course (FR7 + NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: "tutor-1" });
      prismaMock.assignment.create.mockResolvedValue({ id: 1, title: "HW1", courseId: 1 });

      const res = await POST(req("POST", "http://localhost/api/assignments", {
        courseId: 1, title: "HW1", description: "Do chapter 1",
      }, tutor));

      expect(res.status).toBe(201);
      expect(prismaMock.assignment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: "HW1", courseId: 1 }) })
      );
    });

    it("returns 403 when a STUDENT tries to create (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      const res = await POST(req("POST", "http://localhost/api/assignments", {
        courseId: 1, title: "HW1",
      }, student));
      expect(res.status).toBe(403);
    });

    it("returns 403 when tutor does not own the course (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: "other-tutor" });

      const res = await POST(req("POST", "http://localhost/api/assignments", {
        courseId: 1, title: "HW1",
      }, tutor));
      expect(res.status).toBe(403);
    });

    it("returns 400 when title is missing (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      const res = await POST(req("POST", "http://localhost/api/assignments", { courseId: 1 }, tutor));
      expect(res.status).toBe(400);
    });
  });

  // ── GET single assignment (FR7) ───────────────────────────────────────────
  describe("GET /api/assignments/[id]", () => {
    it("tutor sees all student submissions for an assignment they own (FR7 + NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.assignment.findUnique.mockResolvedValue({
        id: 1, courseId: 1, title: "HW1",
        course: { id: 1, title: "Maths", tutorId: "tutor-1" },
        submissions: [{ id: 10, studentId: "s1" }, { id: 11, studentId: "s2" }],
      });

      const res = await getOne(
        req("GET", "http://localhost/api/assignments/1", undefined, tutor),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.submissions).toHaveLength(2);
    });

    it("student only sees their own submission (NFR2 — data isolation)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.assignment.findUnique.mockResolvedValue({
        id: 1, courseId: 1, title: "HW1",
        course: { id: 1, title: "Maths", tutorId: "tutor-1" },
        submissions: [{ id: 10, studentId: "student-1" }], // only their own
      });
      prismaMock.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" });

      const res = await getOne(
        req("GET", "http://localhost/api/assignments/1", undefined, student),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.submissions).toHaveLength(1);
    });

    it("returns 404 for a non-existent assignment", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.assignment.findUnique.mockResolvedValue(null);

      const res = await getOne(
        req("GET", "http://localhost/api/assignments/999", undefined, tutor),
        { params: { id: "999" } }
      );
      expect(res.status).toBe(404);
    });
  });
});
