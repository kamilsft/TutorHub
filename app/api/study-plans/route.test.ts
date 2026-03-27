import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studyPlan: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  user: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { GET, POST, PUT } from "./route";

describe("/api/study-plans", () => {
  const STUDENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const OTHER_STUDENT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const TUTOR_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 without token", async () => {
    const req = new Request("http://localhost/api/study-plans");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("GET returns own plans for student", async () => {
    prismaMock.studyPlan.findMany.mockResolvedValue([{ id: 1, tasks: [] }] as never);
    const req = new Request("http://localhost/api/study-plans", {
      headers: {
        authorization: `Bearer ${signToken(STUDENT_ID, "STUDENT")}`,
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(prismaMock.studyPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: STUDENT_ID },
      })
    );
  });

  it("GET ignores query params and still returns only the caller's plans", async () => {
    prismaMock.studyPlan.findMany.mockResolvedValue([{ id: 2, tasks: [] }] as never);
    const req = new Request("http://localhost/api/study-plans?scope=discover&studentId=" + OTHER_STUDENT_ID, {
      headers: {
        authorization: `Bearer ${signToken(TUTOR_ID, "TUTOR")}`,
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(prismaMock.studyPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: TUTOR_ID },
      })
    );
  });

  it("POST creates plan for authenticated student (ignores spoofed studentId)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: STUDENT_ID } as never);
    prismaMock.studyPlan.create.mockResolvedValue({
      id: 10,
      studentId: STUDENT_ID,
      tasks: [{ id: 1, title: "Read", courseId: 1, completed: true }],
    } as never);

    const req = new Request("http://localhost/api/study-plans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(STUDENT_ID, "STUDENT")}`,
      },
      body: JSON.stringify({
        // should be ignored for STUDENT role
        studentId: OTHER_STUDENT_ID,
        tasks: [
          { title: "Read", dueDate: "2025-06-01T00:00:00.000Z", courseId: 1, completed: true },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(prismaMock.studyPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: STUDENT_ID,
        }),
      })
    );
  });

  it("PUT returns 403 when student tries to update another student's plan", async () => {
    prismaMock.studyPlan.findUnique.mockResolvedValue({
      id: 5,
      studentId: OTHER_STUDENT_ID,
    } as never);

    const req = new Request("http://localhost/api/study-plans", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(STUDENT_ID, "STUDENT")}`,
      },
      body: JSON.stringify({
        planId: 5,
        tasks: [{ title: "New", dueDate: "2025-07-01T00:00:00.000Z", courseId: 1 }],
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(403);
    expect(prismaMock.studyPlan.update).not.toHaveBeenCalled();
  });

  it("PUT replaces tasks on owned plan and preserves completed flag", async () => {
    prismaMock.studyPlan.findUnique.mockResolvedValue({
      id: 5,
      studentId: STUDENT_ID,
    } as never);
    prismaMock.studyPlan.update.mockResolvedValue({
      id: 5,
      tasks: [{ title: "New", courseId: 1, completed: true }],
    } as never);

    const req = new Request("http://localhost/api/study-plans", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(STUDENT_ID, "STUDENT")}`,
      },
      body: JSON.stringify({
        planId: 5,
        tasks: [{ title: "New", dueDate: "2025-07-01T00:00:00.000Z", courseId: 1, completed: true }],
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(prismaMock.studyPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          tasks: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                title: "New",
                courseId: 1,
                completed: true,
              }),
            ]),
          }),
        }),
      })
    );
  });

  it("PUT returns 403 when a tutor tries to update another user's plan", async () => {
    prismaMock.studyPlan.findUnique.mockResolvedValue({
      id: 8,
      studentId: OTHER_STUDENT_ID,
    } as never);

    const req = new Request("http://localhost/api/study-plans", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(TUTOR_ID, "TUTOR")}`,
      },
      body: JSON.stringify({
        planId: 8,
        tasks: [{ title: "Tutor update", dueDate: "2025-08-01T00:00:00.000Z", courseId: 2 }],
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(403);
    expect(prismaMock.studyPlan.update).not.toHaveBeenCalled();
  });
});
