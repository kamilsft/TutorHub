import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  task: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { PATCH } from "./route";

const STUDENT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_STUDENT = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const TUTOR = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe("PATCH /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without token", async () => {
    const req = new Request("http://localhost/api/tasks/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 when student does not own the task", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 1,
      studyPlan: { studentId: OTHER_STUDENT },
    } as never);

    const req = new Request("http://localhost/api/tasks/1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(STUDENT, "STUDENT")}`,
      },
      body: JSON.stringify({ completed: true }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
    expect(prismaMock.task.update).not.toHaveBeenCalled();
  });

  it("updates task for owning student", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 1,
      studyPlan: { studentId: STUDENT },
    } as never);
    prismaMock.task.update.mockResolvedValue({
      id: 1,
      completed: true,
    } as never);

    const req = new Request("http://localhost/api/tasks/1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(STUDENT, "STUDENT")}`,
      },
      body: JSON.stringify({ completed: true }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
  });

  it("allows tutor to update a task", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 1,
      studyPlan: { studentId: OTHER_STUDENT },
    } as never);
    prismaMock.task.update.mockResolvedValue({
      id: 1,
      completed: false,
    } as never);

    const req = new Request("http://localhost/api/tasks/1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(TUTOR, "TUTOR")}`,
      },
      body: JSON.stringify({ completed: false }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
  });
});
