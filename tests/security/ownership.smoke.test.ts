// tests/security/ownership.smoke.test.ts
// Security smoke tests: ownership violation attempts
// NFR2

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  task: { deleteMany: vi.fn() },
  studyPlan: { delete: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/repositories/studyPlanRepository", () => ({
  findPlanById: vi.fn(),
}));

import { verifyToken } from "@/lib/jwt";
import * as planRepo from "@/lib/repositories/studyPlanRepository";
import { PATCH as coursesPATCH } from "@/app/api/courses/route";
import { DELETE as studyPlanDELETE } from "@/app/api/study-plans/[id]/route";

const TUTOR_A = { sub: "tutor-owner-a", role: "TUTOR" };
const TUTOR_B = { sub: "tutor-owner-b", role: "TUTOR" };
const STUDENT_A = { sub: "student-owner-a", role: "STUDENT" };
const STUDENT_B = { sub: "student-owner-b", role: "STUDENT" };

function makeRequest(method: string, url: string, body?: object, token?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Ownership violation smoke tests (NFR2)", () => {
  beforeEach(() => vi.clearAllMocks());

  // NFR2: tutor-a cannot modify a course owned by tutor-b
  it("PATCH /api/courses returns 403 when tutor-a tries to update tutor-b's course (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue(TUTOR_A as any);
    // Course is owned by tutor-b, not tutor-a
    prismaMock.course.findUnique.mockResolvedValue({
      id: 42,
      tutorId: TUTOR_B.sub,
      title: "Tutor B's Course",
    } as never);

    const req = makeRequest(
      "PATCH",
      "http://localhost/api/courses?id=42",
      { title: "Hijacked Title" },
      "tutor-a-token"
    );
    const res = await coursesPATCH(req);
    expect(res.status).toBe(403);
  });

  // NFR2: student-a cannot delete a study plan owned by student-b
  it("DELETE /api/study-plans/[id] returns 403 when student-a tries to delete student-b's plan (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
    // Plan is owned by student-b, not student-a
    vi.mocked(planRepo.findPlanById).mockResolvedValue({
      id: 7,
      studentId: STUDENT_B.sub,
      tasks: [],
    } as any);

    const req = makeRequest(
      "DELETE",
      "http://localhost/api/study-plans/7",
      undefined,
      "student-a-token"
    );
    const res = await studyPlanDELETE(req, { params: { id: "7" } });
    expect(res.status).toBe(403);
  });
});
