// api-auth.ts
// Centralised authentication and authorisation helpers
// All routes should use these instead of reading tokens themselves
// This directly addresses NFR1 (authenticated access) and NFR2 (role/ownership enforcement)
// and NFR15 (maintainability) by keeping all the auth logic in one place

import { verifyToken, type JwtPayload } from "@/lib/jwt";
import { Role } from "@prisma/client";

// NFR1 - read the JWT from either the Authorization header or the authToken cookie
export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  const cookie = request.headers.get("cookie") || "";
  const match = /authToken=([^;]+)/.exec(cookie);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

function jsonAuthError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// NFR1 - returns the verified JWT payload or a 401 Response if not logged in
export function requireAuth(request: Request): JwtPayload | Response {
  const token = getTokenFromRequest(request);
  if (!token) {
    return jsonAuthError("Unauthorized", 401);
  }
  const payload = verifyToken(token);
  if (!payload) {
    return jsonAuthError("Invalid token", 401);
  }
  return payload;
}

// Alias so route files are more readable
export function requireAuthenticatedUser(request: Request): JwtPayload | Response {
  return requireAuth(request);
}

// NFR2 - checks auth AND that the user has the required role
// returns the payload on success, or a 401/403 Response on failure
export function requireRole(request: Request, role: Role): JwtPayload | Response {
  const result = requireAuth(request);
  if (result instanceof Response) return result;
  if (result.role !== role) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return result;
}

// NFR2 - shorthand helpers for the two main roles
export function requireTutor(request: Request): JwtPayload | Response {
  return requireRole(request, Role.TUTOR);
}

export function requireStudent(request: Request): JwtPayload | Response {
  return requireRole(request, Role.STUDENT);
}

// NFR2 - after verifying auth, check that the logged-in user owns the resource
export function requireOwnership(
  payload: JwtPayload,
  ownerId: string
): JwtPayload | Response {
  if (payload.sub !== ownerId) {
    return new Response(JSON.stringify({ error: "Forbidden: you do not own this resource" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return payload;
}

// Helper type guard so route handlers can do: if (isAuthError(auth)) return auth;
export function isAuthError(result: JwtPayload | Response): result is Response {
  return result instanceof Response;
}
