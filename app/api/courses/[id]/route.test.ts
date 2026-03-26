import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  course: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { PATCH } from "./route";

const OWNER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const OTHER_TUTOR = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe("PATCH /api/courses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without token", async () => {
    const req = new Request("http://localhost/api/courses/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-tutor roles", async () => {
    const req = new Request("http://localhost/api/courses/1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "STUDENT")}`,
      },
      body: JSON.stringify({ title: "Updated" }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("returns 404 when course does not exist", async () => {
    prismaMock.course.findUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api/courses/1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(OWNER, "TUTOR")}`,
      },
      body: JSON.stringify({ title: "Updated" }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(404);
  });

  it("returns 403 when tutor does not own the course", async () => {
    prismaMock.course.findUnique.mockResolvedValue({ tutorId: OTHER_TUTOR } as never);

    const req = new Request("http://localhost/api/courses/1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(OWNER, "TUTOR")}`,
      },
      body: JSON.stringify({ title: "Updated" }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("updates owned course for tutor", async () => {
    prismaMock.course.findUnique.mockResolvedValue({ tutorId: OWNER } as never);
    prismaMock.course.update.mockResolvedValue({
      id: 1,
      title: "Updated",
      subject: "Math",
      isPublished: false,
    } as never);

    const req = new Request("http://localhost/api/courses/1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(OWNER, "TUTOR")}`,
      },
      body: JSON.stringify({
        title: "  Updated  ",
        subject: "Math",
        isPublished: false,
        price: "19.99",
      }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    expect(prismaMock.course.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          title: "Updated",
          subject: "Math",
          isPublished: false,
          price: 19.99,
        }),
      })
    );
  });

  it("returns 400 when title is empty", async () => {
    prismaMock.course.findUnique.mockResolvedValue({ tutorId: OWNER } as never);

    const req = new Request("http://localhost/api/courses/1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${signToken(OWNER, "TUTOR")}`,
      },
      body: JSON.stringify({ title: "   " }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(400);
    expect(prismaMock.course.update).not.toHaveBeenCalled();
  });
});
