// app/api/study-plans/[id]/route.test.ts
// Unit tests for DELETE /api/study-plans/[id]
// FR13 (delete study plan), NFR1 (auth), NFR2 (ownership enforcement)

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  task: { deleteMany: vi.fn() },
  studyPlan: { delete: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/repositories/studyPlanRepository", () => ({
  findPlanById: vi.fn(),
}));

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

import { verifyToken } from "@/lib/jwt";
import * as planRepo from "@/lib/repositories/studyPlanRepository";
import { DELETE } from "./route";

const STUDENT_ID = "student-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_STUDENT_ID = "student-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function makeRequest(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request("http://localhost/api/study-plans/1", { method: "DELETE", headers });
}

describe("DELETE /api/study-plans/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no token is provided (NFR1)", async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const req = makeRequest();
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a STUDENT (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: "tutor-1", role: "TUTOR" } as any);
    // Route checks ownership AFTER finding the plan — must return a plan so the 403 branch is reached
    vi.mocked(planRepo.findPlanById).mockResolvedValue({ id: 1, studentId: "some-student", tasks: [] } as any);
    const req = makeRequest("tutor-token");
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("returns 400 when plan id is not a valid number", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: STUDENT_ID, role: "STUDENT" } as any);
    const req = makeRequest("student-token");
    const res = await DELETE(req, { params: { id: "not-a-number" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid plan id/i);
  });

  it("returns 404 when plan does not exist", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: STUDENT_ID, role: "STUDENT" } as any);
    vi.mocked(planRepo.findPlanById).mockResolvedValue(null as any);
    const req = makeRequest("student-token");
    const res = await DELETE(req, { params: { id: "99" } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("returns 403 when student does not own the plan (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: STUDENT_ID, role: "STUDENT" } as any);
    vi.mocked(planRepo.findPlanById).mockResolvedValue({
      id: 1,
      studentId: OTHER_STUDENT_ID,
      tasks: [],
    } as any);
    const req = makeRequest("student-token");
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/forbidden/i);
  });

  it("returns 200 and deletes tasks and plan when student owns the plan (FR13)", async () => {
    vi.mocked(verifyToken).mockReturnValue({ sub: STUDENT_ID, role: "STUDENT" } as any);
    vi.mocked(planRepo.findPlanById).mockResolvedValue({
      id: 1,
      studentId: STUDENT_ID,
      tasks: [{ id: 10 }],
    } as any);
    prismaMock.task.deleteMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.studyPlan.delete.mockResolvedValue({ id: 1 } as never);

    const req = makeRequest("student-token");
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({ where: { studyPlanId: 1 } });
    expect(prismaMock.studyPlan.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
