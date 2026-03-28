import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/api-auth";

/**
 * GET /api/messages/users?q=   — search users to start a conversation (excludes self).
 */
export async function GET(request: Request) {
  const auth = requireAuthenticatedUser(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: auth.sub },
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: { id: true, fullName: true, email: true, role: true },
      take: 30,
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/messages/users", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
