import { verifyToken, type JwtPayload } from "@/lib/jwt";

/** Read JWT from Authorization: Bearer or authToken cookie (same as other API routes). */
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

export function requireAuthenticatedUser(request: Request): JwtPayload | Response {
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

export function requireTutorRole(
  user: JwtPayload,
  message = "Only tutors can access this"
): JwtPayload | Response {
  if (user.role !== "TUTOR") {
    return jsonAuthError(message, 403);
  }
  return user;
}

export function requireResourceOwner({
  ownerId,
  userId,
  errorMessage = "You do not own this resource",
}: {
  ownerId: string | null | undefined;
  userId: string;
  errorMessage?: string;
}): true | Response {
  if (!ownerId || ownerId !== userId) {
    return jsonAuthError(errorMessage, 403);
  }
  return true;
}

export const requireAuth = requireAuthenticatedUser;
