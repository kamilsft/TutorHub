import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  enrollment: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { GET } from "./route";

const STUDENT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

describe("GET /api/courses/enrolled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for tutor", async () => {
    const req = new Request("http://localhost/api/courses/enrolled", {
      headers: { authorization: `Bearer ${signToken("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "TUTOR")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns flattened courses for student", async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([
      {
        enrolledAt: new Date(),
        course: {
          id: 1,
          title: "Math",
          subject: "M",
          level: "Beginner",
          tutor: { fullName: "T" },
          _count: { assignments: 2 },
        },
      },
    ] as never);

    const req = new Request("http://localhost/api/courses/enrolled", {
      headers: { authorization: `Bearer ${signToken(STUDENT, "STUDENT")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].title).toBe("Math");
  });

  it("returns 500 when service throws unexpectedly", async () => {
    prismaMock.enrollment.findMany.mockRejectedValue(new Error("DB down") as never);
    const req = new Request("http://localhost/api/courses/enrolled", {
      headers: { authorization: `Bearer ${signToken(STUDENT, "STUDENT")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
