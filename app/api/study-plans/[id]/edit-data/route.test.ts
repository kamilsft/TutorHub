// app/api/study-plans/[id]/edit-data/route.test.ts
// Unit tests for GET /api/study-plans/[id]/edit-data
// FR13 (update study plan), NFR1 (auth), NFR2 (ownership enforcement)

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

vi.mock("@/lib/repositories/studyPlanRepository", () => ({
  findPlanById: vi.fn(),
}));

vi.mock("@/lib/repositories/courseRepository", () => ({
  findEnrolledCourses: vi.fn(),
  findCoursesByTutor: vi.fn(),
}));

import { verifyToken } from "@/lib/jwt";
import * as planRepo from "@/lib/repositories/studyPlanRepository";
import * as courseRepo from "@/lib/repositories/courseRepository";
import { GET } from "./route";

const STUDENT_ID = "student-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_STUDENT_ID = "student-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const TUTOR_ID = "tutor-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function makeRequest(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request("http://localhost/api/study-plans/1/edit-data", { headers });
}

const MOCK_PLAN = { id: 1, studentId: STUDENT_ID, tasks: [] };

describe("GET /api/study-plans/[id]/edit-data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no token is provided (NFR1)", async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const res = await GET(makeRequest(), { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

  it("returns 400 when plan id is not a valid number", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: STUDENT_ID, role: "STUDENT" } as any);
    const res = await GET(makeRequest("token"), { params: { id: "not-a-number" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid plan id/i);
  });

  it("returns 404 when plan does not exist", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: STUDENT_ID, role: "STUDENT" } as any);
    vi.mocked(planRepo.findPlanById).mockResolvedValue(null as any);
    const res = await GET(makeRequest("token"), { params: { id: "99" } });
    expect(res.status).toBe(404);
  });

  it("returns 403 when student does not own the plan (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: STUDENT_ID, role: "STUDENT" } as any);
    vi.mocked(planRepo.findPlanById).mockResolvedValue({ ...MOCK_PLAN, studentId: OTHER_STUDENT_ID } as any);
    const res = await GET(makeRequest("token"), { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("returns 200 with plan and courses for student who owns the plan (FR13)", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: STUDENT_ID, role: "STUDENT" } as any);
    vi.mocked(planRepo.findPlanById).mockResolvedValue(MOCK_PLAN as any);
    vi.mocked(courseRepo.findEnrolledCourses).mockResolvedValue([
      { course: { id: 10, title: "Math 101" } },
    ] as any);
    const res = await GET(makeRequest("token"), { params: { id: "1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("plan");
    expect(body).toHaveProperty("courses");
    expect(body.courses[0]).toMatchObject({ id: 10, title: "Math 101" });
  });

  it("returns 403 when tutor has no shared course with the student (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: TUTOR_ID, role: "TUTOR" } as any);
    vi.mocked(planRepo.findPlanById).mockResolvedValue(MOCK_PLAN as any);
    vi.mocked(courseRepo.findCoursesByTutor).mockResolvedValue([{ id: 5 }] as any);
    vi.mocked(courseRepo.findEnrolledCourses).mockResolvedValue([
      { course: { id: 99 } },
    ] as any);
    const res = await GET(makeRequest("token"), { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("returns 200 with plan and courses for tutor with a shared course (FR13)", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: TUTOR_ID, role: "TUTOR" } as any);
    vi.mocked(planRepo.findPlanById).mockResolvedValue(MOCK_PLAN as any);
    vi.mocked(courseRepo.findCoursesByTutor).mockResolvedValue([{ id: 10, title: "Math 101" }] as any);
    vi.mocked(courseRepo.findEnrolledCourses).mockResolvedValue([
      { course: { id: 10 } },
    ] as any);
    const res = await GET(makeRequest("token"), { params: { id: "1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("plan");
    expect(body.courses[0]).toMatchObject({ id: 10, title: "Math 101" });
  });
});
