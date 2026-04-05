import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  course: { findUnique: vi.fn() },
  enrollment: {
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { POST } from "./route";

const studentToken = () =>
  signToken("student-uuid-1111-1111-1111-111111111111", "STUDENT");

describe("POST /api/enrollments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without token", async () => {
    const req = new Request("http://localhost/api/enrollments", {
      method: "POST",
      body: JSON.stringify({ courseId: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when not a student", async () => {
    const token = signToken("tutor-uuid-2222-2222-2222-222222222222", "TUTOR");
    const req = new Request("http://localhost/api/enrollments", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 when course not published", async () => {
    prismaMock.course.findUnique.mockResolvedValue(null);
    const req = new Request("http://localhost/api/enrollments", {
      method: "POST",
      headers: {
        authorization: `Bearer ${studentToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId: 99 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  // FR6: successfully creates enrollment and returns 201
  it("creates enrollment when course published and capacity ok", async () => {
    prismaMock.course.findUnique.mockResolvedValue({
      id: 1,
      isPublished: true,
      capacity: 10,
    } as never);
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    prismaMock.enrollment.count.mockResolvedValue(3 as never);
    prismaMock.enrollment.create.mockResolvedValue({
      id: 1,
      studentId: "student-uuid-1111-1111-1111-111111111111",
      courseId: 1,
      status: "ACTIVE",
    } as never);

    const req = new Request("http://localhost/api/enrollments", {
      method: "POST",
      headers: {
        authorization: `Bearer ${studentToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  // FR6: student who is already enrolled receives 200 with alreadyEnrolled response
  // Covers the alreadyEnrolled=true branch in route.ts line 20-22
  it("returns 200 with already-enrolled message when student re-enrolls (FR6)", async () => {
    prismaMock.course.findUnique.mockResolvedValue({
      id: 1,
      isPublished: true,
      capacity: 10,
    } as never);
    // findUnique returns an existing enrollment → alreadyEnrolled path
    prismaMock.enrollment.findUnique.mockResolvedValue({
      id: 1,
      studentId: "student-uuid-1111-1111-1111-111111111111",
      courseId: 1,
      status: "ACTIVE",
    } as never);
    prismaMock.enrollment.count.mockResolvedValue(1 as never);

    const req = new Request("http://localhost/api/enrollments", {
      method: "POST",
      headers: {
        authorization: `Bearer ${studentToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.error).toMatch(/already enrolled/i);
  });

  it("returns 500 when service throws unexpectedly", async () => {
    prismaMock.course.findUnique.mockRejectedValue(new Error("DB down") as never);
    const req = new Request("http://localhost/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken()}` },
      body: JSON.stringify({ courseId: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
