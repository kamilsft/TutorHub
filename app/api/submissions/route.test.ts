import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  submission: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  assignment: { findUnique: vi.fn() },
  course: { findUnique: vi.fn() },
  enrollment: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { GET, POST } from "./route";

const STUDENT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TUTOR = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("/api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 400 without assignmentId or courseId", async () => {
      const req = new Request("http://localhost/api/submissions", {
        headers: { authorization: `Bearer ${signToken(STUDENT, "STUDENT")}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("student GET filters to own submissions", async () => {
      prismaMock.submission.findMany.mockResolvedValue([] as never);
      const req = new Request("http://localhost/api/submissions?assignmentId=1", {
        headers: { authorization: `Bearer ${signToken(STUDENT, "STUDENT")}` },
      });
      await GET(req);
      expect(prismaMock.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ studentId: STUDENT, assignmentId: 1 }),
        })
      );
    });

    it("tutor GET checks course ownership", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ courseId: 3 } as never);
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: TUTOR } as never);
      prismaMock.submission.findMany.mockResolvedValue([] as never);

      const req = new Request("http://localhost/api/submissions?assignmentId=1", {
        headers: { authorization: `Bearer ${signToken(TUTOR, "TUTOR")}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("returns 403 when tutor does not own course", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ courseId: 3 } as never);
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: "someone-else" } as never);

      const req = new Request("http://localhost/api/submissions?assignmentId=1", {
        headers: { authorization: `Bearer ${signToken(TUTOR, "TUTOR")}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  describe("POST", () => {
    it("returns 403 for non-student", async () => {
      const req = new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${signToken(TUTOR, "TUTOR")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignmentId: 1, content: "work" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 when content empty", async () => {
      const req = new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${signToken(STUDENT, "STUDENT")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignmentId: 1, content: "   " }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    // FR8: first-time submission returns 201
    it("creates submission when enrolled", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 1, courseId: 2 } as never);
      prismaMock.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" } as never);
      prismaMock.submission.findFirst.mockResolvedValue(null);
      prismaMock.submission.create.mockResolvedValue({
        id: 9,
        assignmentId: 1,
        studentId: STUDENT,
        content: "answer",
      } as never);

      const req = new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${signToken(STUDENT, "STUDENT")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignmentId: 1, content: "answer" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    // FR8: re-submission (student updates existing work) returns 200 with resubmitted=true
    // Covers the resubmitted=true branch in route.ts line 40
    it("returns 200 with resubmitted=true when student resubmits (FR8)", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 1, courseId: 2 } as never);
      prismaMock.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" } as never);
      // existing submission found → resubmit path
      prismaMock.submission.findFirst.mockResolvedValue({
        id: 5,
        assignmentId: 1,
        studentId: STUDENT,
        content: "old answer",
      } as never);
      prismaMock.submission.update.mockResolvedValue({
        id: 5,
        assignmentId: 1,
        studentId: STUDENT,
        content: "updated answer",
      } as never);

      const req = new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${signToken(STUDENT, "STUDENT")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignmentId: 1, content: "updated answer" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.resubmitted).toBe(true);
    });

    it("returns 500 on unexpected POST error", async () => {
      prismaMock.assignment.findUnique.mockRejectedValue(new Error("DB down") as never);
      const token = signToken(STUDENT, "STUDENT");
      const res = await POST(new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignmentId: 1, content: "answer" }),
      }));
      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/submissions — 500 error path", () => {
    it("returns 500 on unexpected GET error", async () => {
      prismaMock.submission.findMany.mockRejectedValue(new Error("DB down") as never);
      const token = signToken(STUDENT, "STUDENT");
      const res = await GET(new Request("http://localhost/api/submissions?assignmentId=1", {
        headers: { Authorization: `Bearer ${token}` },
      }));
      expect(res.status).toBe(500);
    });
  });
});
