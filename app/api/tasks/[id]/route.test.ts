import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  task: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { PATCH } from "./route";

const mockStudentPayload = { sub: "student-1", role: "STUDENT" };

function makeRequest(body: object, token?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request("http://localhost/api/tasks/1", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/tasks/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const res = await PATCH(makeRequest({ completed: true }), { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid completed value", async () => {
    vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
    prismaMock.task.findUnique.mockResolvedValue({
      id: 1,
      studyPlan: { studentId: "student-1" },
    } as never);
    const res = await PATCH(makeRequest({ completed: "yes" }, "token"), { params: { id: "1" } });
    expect(res.status).toBe(400);
  });

  it("returns 403 when student does not own the task's study plan", async () => {
    vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
    prismaMock.task.findUnique.mockResolvedValue({
      id: 1,
      studyPlan: { studentId: "other-student" },
    } as never);

    const res = await PATCH(makeRequest({ completed: true }, "token"), { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("returns 404 when task does not exist", async () => {
    vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
    prismaMock.task.findUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ completed: true }, "token"), { params: { id: "99" } });
    expect(res.status).toBe(404);
  });

  it("toggles task when student owns the plan", async () => {
    vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
    prismaMock.task.findUnique.mockResolvedValue({
      id: 1,
      studyPlan: { studentId: "student-1" },
    } as never);
    prismaMock.task.update.mockResolvedValue({ id: 1, completed: true } as never);

    const res = await PATCH(makeRequest({ completed: true }, "token"), { params: { id: "1" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.completed).toBe(true);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(verifyToken).mockReturnValue(mockStudentPayload as any);
    prismaMock.task.findUnique.mockRejectedValue(new Error("DB down") as never);
    const res = await PATCH(makeRequest({ completed: true }, "token"), { params: { id: "1" } });
    expect(res.status).toBe(500);
  });
});
