import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  assignment: { findUnique: vi.fn() },
  enrollment: { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET } from "./route";

const TUTOR = "tutor-1";
const STUDENT = "student-1";
const tutorPayload = { sub: TUTOR, role: "TUTOR" };
const studentPayload = { sub: STUDENT, role: "STUDENT" };

function makeReq(token = "token"): Request {
  return new Request("http://localhost/api/assignments/1", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("GET /api/assignments/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const res = await GET(new Request("http://localhost/api/assignments/1"), {
      params: { id: "1" },
    });
    expect(res.status).toBe(401);
  });

  // NFR4: non-numeric id should return 400 before hitting the database
  // Covers the isNaN branch in route.ts line 16
  it("returns 400 for non-numeric assignment id (NFR4)", async () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    const res = await GET(makeReq(), { params: { id: "abc" } });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid assignment id/i);
  });

  it("returns 404 when assignment not found", async () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    prismaMock.assignment.findUnique.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: { id: "1" } });
    expect(res.status).toBe(404);
  });

  it("returns 403 when tutor does not own course", async () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    prismaMock.assignment.findUnique.mockResolvedValue({
      id: 1,
      courseId: 1,
      course: { tutorId: "other" },
      submissions: [],
    } as never);
    const res = await GET(makeReq(), { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("returns 403 when student is not enrolled", async () => {
    vi.mocked(verifyToken).mockReturnValue(studentPayload as any);
    prismaMock.assignment.findUnique.mockResolvedValue({
      id: 1,
      courseId: 1,
      course: { tutorId: TUTOR },
      submissions: [],
    } as never);
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("returns assignment to tutor who owns course", async () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    prismaMock.assignment.findUnique.mockResolvedValue({
      id: 1,
      title: "HW1",
      courseId: 1,
      course: { id: 1, title: "Math", tutorId: TUTOR },
      submissions: [],
    } as never);
    const res = await GET(makeReq(), { params: { id: "1" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("HW1");
  });

  it("returns assignment to enrolled student (only their submissions)", async () => {
    vi.mocked(verifyToken).mockReturnValue(studentPayload as any);
    prismaMock.assignment.findUnique.mockResolvedValue({
      id: 1,
      title: "HW1",
      courseId: 1,
      course: { id: 1, title: "Math", tutorId: TUTOR },
      submissions: [{ id: 5, studentId: STUDENT, content: "answer" }],
    } as never);
    prismaMock.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" } as never);
    const res = await GET(makeReq(), { params: { id: "1" } });
    expect(res.status).toBe(200);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    prismaMock.assignment.findUnique.mockRejectedValue(new Error("DB down") as never);
    const res = await GET(makeReq(), { params: { id: "1" } });
    expect(res.status).toBe(500);
  });
});
