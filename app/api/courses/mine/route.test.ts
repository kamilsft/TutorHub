import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  course: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { GET } from "./route";

const TUTOR = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("GET /api/courses/mine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without token", async () => {
    const res = await GET(new Request("http://localhost/api/courses/mine"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for student", async () => {
    const req = new Request("http://localhost/api/courses/mine", {
      headers: { authorization: `Bearer ${signToken("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "STUDENT")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns tutor courses", async () => {
    prismaMock.course.findMany.mockResolvedValue([{ id: 1, title: "A" }] as never);
    const req = new Request("http://localhost/api/courses/mine", {
      headers: { authorization: `Bearer ${signToken(TUTOR, "TUTOR")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it("returns 500 when service throws unexpectedly", async () => {
    prismaMock.course.findMany.mockRejectedValue(new Error("DB down") as never);
    const req = new Request("http://localhost/api/courses/mine", {
      headers: { authorization: `Bearer ${signToken(TUTOR, "TUTOR")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
