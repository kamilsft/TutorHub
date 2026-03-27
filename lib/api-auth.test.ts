import { describe, expect, it } from "vitest";
import {
  getTokenFromRequest,
  requireAuthenticatedUser,
  requireResourceOwner,
  requireTutorRole,
} from "@/lib/api-auth";
import { signToken } from "@/lib/jwt";
import {
  FIXTURE_ROLE,
  FIXTURE_USER_ID,
  requestWithAuthCookie,
  requestWithBearerToken,
} from "@/tests/fixtures/auth";

describe("getTokenFromRequest (FR: API accepts Bearer or cookie)", () => {
  it("reads Bearer token", () => {
    const token = signToken(FIXTURE_USER_ID, FIXTURE_ROLE);
    const req = requestWithBearerToken(token);
    expect(getTokenFromRequest(req)).toBe(token);
  });

  it("reads authToken cookie (URL-decoded)", () => {
    const token = signToken(FIXTURE_USER_ID, FIXTURE_ROLE);
    const req = requestWithAuthCookie(token);
    expect(getTokenFromRequest(req)).toBe(token);
  });

  it("returns null when no auth", () => {
    expect(getTokenFromRequest(new Request("http://localhost/"))).toBeNull();
  });
});

describe("requireAuthenticatedUser (FR: protected API returns 401 without valid JWT)", () => {
  it("returns JwtPayload for valid Bearer token", () => {
    const token = signToken(FIXTURE_USER_ID, FIXTURE_ROLE);
    const result = requireAuthenticatedUser(requestWithBearerToken(token));
    expect(result).not.toBeInstanceOf(Response);
    if (!(result instanceof Response)) {
      expect(result.sub).toBe(FIXTURE_USER_ID);
      expect(result.role).toBe(FIXTURE_ROLE);
    }
  });

  it("returns 401 Response when token missing", () => {
    const result = requireAuthenticatedUser(new Request("http://localhost/"));
    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.status).toBe(401);
  });

  it("returns 401 Response when token invalid", () => {
    const req = requestWithBearerToken("bad.token.here");
    const result = requireAuthenticatedUser(req);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });
});

describe("requireTutorRole", () => {
  it("returns the user when the role is tutor", () => {
    const tutor = { sub: FIXTURE_USER_ID, role: "TUTOR" as const };
    expect(requireTutorRole(tutor)).toEqual(tutor);
  });

  it("returns 403 Response for non-tutors", () => {
    const result = requireTutorRole({ sub: FIXTURE_USER_ID, role: "STUDENT" });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });
});

describe("requireResourceOwner", () => {
  it("returns true for the owner", () => {
    expect(requireResourceOwner({ ownerId: FIXTURE_USER_ID, userId: FIXTURE_USER_ID })).toBe(true);
  });

  it("returns 403 Response when the user does not own the resource", () => {
    const result = requireResourceOwner({ ownerId: "someone-else", userId: FIXTURE_USER_ID });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });
});
