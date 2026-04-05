import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  assignment: { findMany: vi.fn(), create: vi.fn() },
  course: { findUnique: vi.fn() },
  enrollment: { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET, POST } from "./route";

const TUTOR = "tutor-1";
const STUDENT = "student-1";
const tutorPayload = { sub: TUTOR, role: "TUTOR" };
const studentPayload = { sub: STUDENT, role: "STUDENT" };

function makeReq(method: string, url: string, body?: object, token = "token"): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/assignments", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await GET(new Request("http://localhost/api/assignments?courseId=1"));
      expect(res.status).toBe(401);
    });

    it("returns 400 when courseId missing", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
      const res = await GET(makeReq("GET", "http://localhost/api/assignments"));
      expect(res.status).toBe(400);
    });

    it("returns 403 when tutor does not own course", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: "other" } as never);
      const res = await GET(makeReq("GET", "http://localhost/api/assignments?courseId=1"));
      expect(res.status).toBe(403);
    });

    it("returns 403 when student is not enrolled", async () => {
      vi.mocked(verifyToken).mockReturnValue(studentPayload as any);
      prismaMock.enrollment.findUnique.mockResolvedValue(null);
      const res = await GET(makeReq("GET", "http://localhost/api/assignments?courseId=1"));
      expect(res.status).toBe(403);
    });

    it("returns assignments when tutor owns course", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: TUTOR } as never);
      prismaMock.assignment.findMany.mockResolvedValue([{ id: 1, title: "HW1" }] as never);
      const res = await GET(makeReq("GET", "http://localhost/api/assignments?courseId=1"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
    });

    it("returns assignments when student is enrolled", async () => {
      vi.mocked(verifyToken).mockReturnValue(studentPayload as any);
      prismaMock.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" } as never);
      prismaMock.assignment.findMany.mockResolvedValue([{ id: 2, title: "HW2" }] as never);
      const res = await GET(makeReq("GET", "http://localhost/api/assignments?courseId=1"));
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("returns 403 when student tries to create", async () => {
      vi.mocked(verifyToken).mockReturnValue(studentPayload as any);
      const res = await POST(
        makeReq("POST", "http://localhost/api/assignments", { courseId: 1, title: "HW" })
      );
      expect(res.status).toBe(403);
    });

    it("returns 400 when title missing", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
      const res = await POST(
        makeReq("POST", "http://localhost/api/assignments", { courseId: 1 })
      );
      expect(res.status).toBe(400);
    });

    it("returns 403 when tutor does not own course", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: "other" } as never);
      const res = await POST(
        makeReq("POST", "http://localhost/api/assignments", { courseId: 1, title: "HW" })
      );
      expect(res.status).toBe(403);
    });

    it("creates assignment when tutor owns course", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
      prismaMock.course.findUnique.mockResolvedValue({ tutorId: TUTOR } as never);
      prismaMock.assignment.create.mockResolvedValue({ id: 1, title: "HW", courseId: 1 } as never);
      const res = await POST(
        makeReq("POST", "http://localhost/api/assignments", { courseId: 1, title: "HW" })
      );
      expect(res.status).toBe(201);
    });

  it("returns 500 on unexpected GET error", async () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    prismaMock.assignment.findMany.mockRejectedValue(new Error("DB down") as never);
    const res = await GET(makeReq("GET", "http://localhost/api/assignments?courseId=1"));
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected POST error", async () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    prismaMock.course.findUnique.mockRejectedValue(new Error("DB down") as never);
    const res = await POST(makeReq("POST", "http://localhost/api/assignments", { courseId: 1, title: "T" }));
    expect(res.status).toBe(500);
  });
  });
});
