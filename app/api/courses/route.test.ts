import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { GET, POST } from "./route";

describe("/api/courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns published courses", async () => {
      prismaMock.course.findMany.mockResolvedValue([{ id: 1, title: "Math" }] as never);
      const req = new Request("http://localhost/api/courses");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublished: true }),
        })
      );
    });

    it("filters by subject when query param set", async () => {
      prismaMock.course.findMany.mockResolvedValue([]);
      const req = new Request("http://localhost/api/courses?subject=Physics");
      await GET(req);
      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subject: "Physics", isPublished: true }),
        })
      );
    });
  });

  describe("POST", () => {
    it("returns 401 without authentication", async () => {
      const req = new Request("http://localhost/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "T", subject: "S" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-tutors", async () => {
      const req = new Request("http://localhost/api/courses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${signToken("student-1", "STUDENT")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "T", subject: "S" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("creates course for authenticated tutor", async () => {
      prismaMock.course.create.mockResolvedValue({
        id: 5,
        title: "Calc",
        subject: "Math",
        tutorId: "t1",
      } as never);

      const req = new Request("http://localhost/api/courses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${signToken("t1", "TUTOR")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Calc",
          subject: "Math",
          isPublished: true,
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(prismaMock.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tutorId: "t1" }),
        })
      );
    });

    it("ignores spoofed tutorId input and uses the authenticated tutor", async () => {
      prismaMock.course.create.mockResolvedValue({
        id: 6,
        title: "Physics I",
        subject: "Physics",
        tutorId: "real-tutor",
      } as never);

      const req = new Request("http://localhost/api/courses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${signToken("real-tutor", "TUTOR")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Physics I",
          subject: "Physics",
          tutorId: "spoofed-tutor",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(prismaMock.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tutorId: "real-tutor" }),
        })
      );
    });
  });
});
