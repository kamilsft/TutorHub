// tests/security/access-control.smoke.test.ts
// Security smoke tests: unauthorized access, role enforcement, ownership violations
// NFR1, NFR2

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  enrollment: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  assignment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { POST as coursesPOST, PATCH as coursesPATCH } from "@/app/api/courses/route";
import { POST as enrollmentsPOST } from "@/app/api/enrollments/route";
import { POST as assignmentsPOST } from "@/app/api/assignments/route";

const STUDENT_PAYLOAD = { sub: "student-sec-1", role: "STUDENT" };
const TUTOR_PAYLOAD = { sub: "tutor-sec-1", role: "TUTOR" };

function makeRequest(method: string, url: string, body?: object, token?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Access control smoke tests (NFR1, NFR2)", () => {
  beforeEach(() => vi.clearAllMocks());

  // NFR2: STUDENT must not be able to create courses — only TUTORs can
  it("POST /api/courses returns 403 when called by a STUDENT (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT_PAYLOAD as any);
    const req = makeRequest(
      "POST",
      "http://localhost/api/courses",
      { title: "Hacked Course", subject: "Math" },
      "student-token"
    );
    const res = await coursesPOST(req);
    expect(res.status).toBe(403);
  });

  // NFR2: TUTOR must not be able to enroll in courses — only STUDENTs can
  it("POST /api/enrollments returns 403 when called by a TUTOR (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue(TUTOR_PAYLOAD as any);
    const req = makeRequest(
      "POST",
      "http://localhost/api/enrollments",
      { courseId: 1 },
      "tutor-token"
    );
    const res = await enrollmentsPOST(req);
    expect(res.status).toBe(403);
  });

  // NFR1: unauthenticated PATCH must be rejected with 401
  it("PATCH /api/courses returns 401 with no token (NFR1)", async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const req = makeRequest("PATCH", "http://localhost/api/courses?id=1", { title: "Pwned" });
    const res = await coursesPATCH(req);
    expect(res.status).toBe(401);
  });

  // NFR2: STUDENT must not be able to create assignments — only TUTORs can
  it("POST /api/assignments returns 403 when called by a STUDENT (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT_PAYLOAD as any);
    const req = makeRequest(
      "POST",
      "http://localhost/api/assignments",
      { courseId: 1, title: "Fake Assignment", description: "..." },
      "student-token"
    );
    const res = await assignmentsPOST(req);
    expect(res.status).toBe(403);
  });
});
