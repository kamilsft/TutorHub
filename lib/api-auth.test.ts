import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));
import { verifyToken } from "@/lib/jwt";
import {
  requireAuth,
  requireAuthenticatedUser,
  requireTutor,
  requireStudent,
  requireOwnership,
  isAuthError,
} from "./api-auth";

const tutorPayload = { sub: "t1", role: "TUTOR" as any };
const studentPayload = { sub: "s1", role: "STUDENT" as any };

function makeReq(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request("http://localhost/test", { headers });
}

describe("api-auth helpers", () => {
  it("requireAuth returns 401 with no token", () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const result = requireAuth(makeReq());
    expect(result instanceof Response).toBe(true);
    expect((result as Response).status).toBe(401);
  });

  it("requireAuth returns payload for valid token", () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    const result = requireAuth(makeReq("good-token"));
    expect(isAuthError(result)).toBe(false);
    expect((result as any).sub).toBe("t1");
  });

  it("requireTutor returns 403 for STUDENT", () => {
    vi.mocked(verifyToken).mockReturnValue(studentPayload as any);
    const result = requireTutor(makeReq("student-token"));
    expect(result instanceof Response).toBe(true);
    expect((result as Response).status).toBe(403);
  });

  it("requireTutor returns payload for TUTOR", () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    const result = requireTutor(makeReq("tutor-token"));
    expect(isAuthError(result)).toBe(false);
  });

  it("requireStudent returns 403 for TUTOR", () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    const result = requireStudent(makeReq("tutor-token"));
    expect((result as Response).status).toBe(403);
  });

  it("requireOwnership returns 403 when IDs do not match", () => {
    const result = requireOwnership(tutorPayload, "other-id");
    expect(result instanceof Response).toBe(true);
    expect((result as Response).status).toBe(403);
  });

  it("requireOwnership returns payload when IDs match", () => {
    const result = requireOwnership(tutorPayload, "t1");
    expect(isAuthError(result)).toBe(false);
  });

  it("requireAuth returns 401 with 'Invalid token' when token fails verification (NFR1)", async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const result = requireAuth(makeReq("bad-token"));
    expect(result instanceof Response).toBe(true);
    expect((result as Response).status).toBe(401);
    const body = await (result as Response).json();
    expect(body.error).toBe("Invalid token");
  });

  it("requireAuthenticatedUser delegates to requireAuth and returns payload (NFR1)", () => {
    vi.mocked(verifyToken).mockReturnValue(tutorPayload as any);
    const result = requireAuthenticatedUser(makeReq("good-token"));
    expect(isAuthError(result)).toBe(false);
    expect((result as any).sub).toBe("t1");
  });

  it("requireAuth accepts token from cookie (NFR1)", () => {
    vi.mocked(verifyToken).mockReturnValue(studentPayload as any);
    const reqWithCookie = new Request("http://localhost/test", {
      headers: { cookie: "authToken=cookie-token-value" },
    });
    const result = requireAuth(reqWithCookie);
    expect(isAuthError(result)).toBe(false);
    expect((result as any).sub).toBe("s1");
  });

  it("requireStudent returns payload for STUDENT (NFR2)", () => {
    vi.mocked(verifyToken).mockReturnValue(studentPayload as any);
    const result = requireStudent(makeReq("student-token"));
    expect(isAuthError(result)).toBe(false);
    expect((result as any).role).toBe("STUDENT");
  });
});
