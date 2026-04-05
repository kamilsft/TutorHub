// tests/integration/submissions.integration.test.ts
// Integration tests for assignment submissions and tutor review
// FR8 (submit work), FR9 (review/grade), NFR1, NFR2, NFR4

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  submission: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  assignment:  { findUnique: vi.fn() },
  course:      { findUnique: vi.fn() },
  enrollment:  { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET, POST }  from "@/app/api/submissions/route";
import { PATCH as review } from "@/app/api/submissions/[id]/review/route";

const student = { sub: "student-1", role: "STUDENT" };
const tutor   = { sub: "tutor-1",   role: "TUTOR"   };

function req(method: string, url: string, body?: object, payload?: typeof student): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (payload) headers["Authorization"] = "Bearer token";
  return new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

describe("Submissions integration (FR8 + FR9 + NFR1 + NFR2)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── GET submissions ───────────────────────────────────────────────────────
  describe("GET /api/submissions", () => {
    it("returns 401 when unauthenticated (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await GET(new Request("http://localhost/api/submissions?assignmentId=1"));
      expect(res.status).toBe(401);
    });

    it("student sees only their own submissions (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.submission.findMany.mockResolvedValue([]);

      await GET(req("GET", "http://localhost/api/submissions?assignmentId=1", undefined, student));

      expect(prismaMock.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ studentId: "student-1" }),
        })
      );
    });

    it("tutor sees all submissions but only for courses they own (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.assignment.findUnique.mockResolvedValue({ courseId: 3 });
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: "tutor-1" });
      prismaMock.submission.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const res = await GET(req("GET", "http://localhost/api/submissions?assignmentId=1", undefined, tutor));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
    });

    it("returns 403 when tutor queries a course they do not own (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.assignment.findUnique.mockResolvedValue({ courseId: 3 });
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: "different-tutor" });

      const res = await GET(req("GET", "http://localhost/api/submissions?assignmentId=1", undefined, tutor));
      expect(res.status).toBe(403);
    });

    it("returns 400 when neither assignmentId nor courseId is supplied (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      const res = await GET(req("GET", "http://localhost/api/submissions", undefined, student));
      expect(res.status).toBe(400);
    });
  });

  // ── POST submissions (FR8) ────────────────────────────────────────────────
  describe("POST /api/submissions", () => {
    it("creates a submission for an enrolled student (FR8)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 1, courseId: 2 });
      prismaMock.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" });
      prismaMock.submission.findFirst.mockResolvedValue(null);
      prismaMock.submission.create.mockResolvedValue({ id: 9, studentId: "student-1", content: "My answer" });

      const res = await POST(req("POST", "http://localhost/api/submissions", {
        assignmentId: 1, content: "My answer",
      }, student));

      expect(res.status).toBe(201);
      // must use JWT identity, not any body studentId
      expect(prismaMock.submission.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ studentId: "student-1" }) })
      );
    });

    it("returns 403 when student is not enrolled in the course (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 1, courseId: 2 });
      prismaMock.enrollment.findUnique.mockResolvedValue(null);

      const res = await POST(req("POST", "http://localhost/api/submissions", {
        assignmentId: 1, content: "My answer",
      }, student));
      expect(res.status).toBe(403);
    });

    it("allows resubmission — updates existing and clears old grade (FR8)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 1, courseId: 2 });
      prismaMock.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" });
      prismaMock.submission.findFirst.mockResolvedValue({ id: 5, grade: 80 }); // existing
      prismaMock.submission.update.mockResolvedValue({ id: 5, grade: null, content: "Updated answer" });

      const res = await POST(req("POST", "http://localhost/api/submissions", {
        assignmentId: 1, content: "Updated answer",
      }, student));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.resubmitted).toBe(true);
      // grade must be cleared on resubmit
      expect(prismaMock.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ grade: null }) })
      );
    });

    it("returns 403 when a TUTOR tries to submit (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      const res = await POST(req("POST", "http://localhost/api/submissions", {
        assignmentId: 1, content: "Cheating",
      }, tutor));
      expect(res.status).toBe(403);
    });

    it("returns 400 for empty content (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      const res = await POST(req("POST", "http://localhost/api/submissions", {
        assignmentId: 1, content: "   ",
      }, student));
      expect(res.status).toBe(400);
    });

    it("returns 404 when assignment does not exist (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.assignment.findUnique.mockResolvedValue(null);

      const res = await POST(req("POST", "http://localhost/api/submissions", {
        assignmentId: 999, content: "My answer",
      }, student));
      expect(res.status).toBe(404);
    });
  });

  // ── PATCH review (FR9) ───────────────────────────────────────────────────
  describe("PATCH /api/submissions/[id]/review", () => {
    it("tutor grades a submission they own (FR9 + NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.submission.findUnique.mockResolvedValue({
        id: 1,
        assignment: { course: { tutorId: "tutor-1" } },
      });
      prismaMock.submission.update.mockResolvedValue({ id: 1, grade: 88, feedback: "Good" });

      const res = await review(
        req("PATCH", "http://localhost/api/submissions/1/review", { grade: 88, feedback: "Good" }, tutor),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("returns 403 when tutor reviews a submission for someone else's course (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.submission.findUnique.mockResolvedValue({
        id: 1,
        assignment: { course: { tutorId: "different-tutor" } },
      });

      const res = await review(
        req("PATCH", "http://localhost/api/submissions/1/review", { grade: 80 }, tutor),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(403);
    });

    it("returns 403 when a STUDENT tries to review (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      const res = await review(
        req("PATCH", "http://localhost/api/submissions/1/review", { grade: 90 }, student),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(403);
    });

    it("returns 400 when grade is out of range (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      const res = await review(
        req("PATCH", "http://localhost/api/submissions/1/review", { grade: 150 }, tutor),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when submission does not exist (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.submission.findUnique.mockResolvedValue(null);

      const res = await review(
        req("PATCH", "http://localhost/api/submissions/999/review", { grade: 80 }, tutor),
        { params: { id: "999" } }
      );
      expect(res.status).toBe(404);
    });

    it("returns 401 when unauthenticated (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await review(
        new Request("http://localhost/api/submissions/1/review", { method: "PATCH" }),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(401);
    });
  });
});
