// app/api/study-plans/route.test.ts
// Unit tests for /api/study-plans
// Covers FR12, FR13, NFR1, NFR2 — auth, ownership, and creation/update behaviour

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  studyPlan: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  // needed for tutor shared-course check in studyPlanService
  course:     { findMany: vi.fn() },
  enrollment: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET, POST, PUT } from "./route";

const mockStudentPayload = { sub: "student-1", role: "STUDENT" };
const mockTutorPayload   = { sub: "tutor-1",   role: "TUTOR"   };

function makeRequest(method: string, url: string, body?: object, token?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const isBodyless = method === "GET" || method === "HEAD";
  return new Request(url, {
    method,
    headers,
    ...(isBodyless ? {} : { body: body ? JSON.stringify(body) : undefined }),
  });
}

const validTask = { title: "Read", dueDate: "2026-06-01T00:00:00.000Z", courseId: 1 };

describe("/api/study-plans", () => {
  beforeEach(() => vi.clearAllMocks());

  // NFR1 + NFR2 — GET should only work for authenticated students
  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const req = makeRequest("GET", "http://localhost/api/study-plans");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when requester is a TUTOR", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockTutorPayload as any);
      const req = makeRequest("GET", "http://localhost/api/study-plans", undefined, "token");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    // NFR2 — student must only see their own plans, even if a different studentId is in the query
    it("returns only plans for the authenticated student (ignores query studentId)", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
      prismaMock.studyPlan.findMany.mockResolvedValue([{ id: 1, tasks: [] }] as never);

      const req = makeRequest("GET", "http://localhost/api/study-plans?studentId=other-student", undefined, "token");
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(prismaMock.studyPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studentId: "student-1" } })
      );
    });
  });

  // FR12 + NFR1 + NFR2 — POST creates a plan for the logged-in student only
  describe("POST", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const req = makeRequest("POST", "http://localhost/api/study-plans", { tasks: [validTask] });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when tasks array is missing", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
      const req = makeRequest("POST", "http://localhost/api/study-plans", {}, "token");
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    // NFR2 — studentId from the body must be ignored; only the JWT identity is used
    it("creates plan for the authenticated student and ignores body studentId", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
      prismaMock.studyPlan.create.mockResolvedValue({
        id: 10,
        studentId: "student-1",
        tasks: [{ id: 1, title: "Read", courseId: 1 }],
      } as never);

      const req = makeRequest(
        "POST",
        "http://localhost/api/study-plans",
        { studentId: "injected-id", tasks: [validTask] },
        "token"
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(prismaMock.studyPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ studentId: "student-1" }),
        })
      );
    });
  });

  // FR13 + NFR2 — PUT updates a plan with ownership rules
  describe("PUT", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const req = makeRequest("PUT", "http://localhost/api/study-plans", { planId: 5, tasks: [validTask] });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when planId is missing", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
      const req = makeRequest("PUT", "http://localhost/api/study-plans", { tasks: [validTask] }, "token");
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    // NFR2 — students cannot edit plans they don't own
    it("returns 403 when student does not own the plan", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "other-student", tasks: [] } as never);

      const req = makeRequest("PUT", "http://localhost/api/study-plans", { planId: 5, tasks: [validTask] }, "token");
      const res = await PUT(req);
      expect(res.status).toBe(403);
    });

    // FR13 — student can update their own plan
    it("updates plan owned by the authenticated student", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "student-1", tasks: [] } as never);
      prismaMock.studyPlan.update.mockResolvedValue({ id: 5, tasks: [{ title: "Read", courseId: 1 }] } as never);

      const req = makeRequest("PUT", "http://localhost/api/study-plans", { planId: 5, tasks: [validTask] }, "token");
      const res = await PUT(req);
      expect(res.status).toBe(200);
    });

    // NFR2 — tutor is refused if they have no shared course with the student
    it("returns 403 when TUTOR has no course in common with the student (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockTutorPayload as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "student-1", tasks: [] } as never);
      // Tutor teaches course 99; student is enrolled in course 1 — no overlap
      prismaMock.course.findMany.mockResolvedValue([{ id: 99, tutorId: "tutor-1" }] as never);
      prismaMock.enrollment.findMany.mockResolvedValue([
        { course: { id: 1 }, enrolledAt: new Date() },
      ] as never);

      const req = makeRequest("PUT", "http://localhost/api/study-plans", { planId: 5, tasks: [validTask] }, "tutor-token");
      const res = await PUT(req);
      expect(res.status).toBe(403);
    });

    // FR13 — tutor CAN edit when they share at least one course with the student
    it("allows TUTOR to update a student's plan when they share a course (FR13 + NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(mockTutorPayload as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "student-1", tasks: [] } as never);
      // Shared course: tutor teaches course 1; student is enrolled in course 1
      prismaMock.course.findMany.mockResolvedValue([
        { id: 1, tutorId: "tutor-1", tutor: { id: "tutor-1", fullName: "T", avatar: null } },
      ] as never);
      prismaMock.enrollment.findMany.mockResolvedValue([
        { course: { id: 1, title: "Maths" }, enrolledAt: new Date() },
      ] as never);
      prismaMock.studyPlan.update.mockResolvedValue({ id: 5, tasks: [{ title: "Read", courseId: 1 }] } as never);

      const req = makeRequest("PUT", "http://localhost/api/study-plans", { planId: 5, tasks: [validTask] }, "tutor-token");
      const res = await PUT(req);
      expect(res.status).toBe(200);
    });

    it("returns 500 on unexpected PUT error", async () => {
      vi.mocked(verifyToken).mockReturnValue({ sub: "student-1", role: "STUDENT" } as any);
      prismaMock.studyPlan.findUnique.mockRejectedValue(new Error("DB down") as never);
      const res = await PUT(new Request("http://localhost/api/study-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ planId: 1, tasks: [] }),
      }));
      expect(res.status).toBe(500);
    });
  });
});
