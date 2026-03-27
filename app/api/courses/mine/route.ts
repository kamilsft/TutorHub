import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireTutorRole } from "@/lib/api-auth";

// GET /api/courses/mine
// returns the courses that belong to the logged-in tutor
export async function GET(request: Request) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const tutor = requireTutorRole(auth);
    if (tutor instanceof Response) return tutor;

    const courses = await prisma.course.findMany({
      where: { tutorId: tutor.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        isPublished: true,
        _count: { select: { enrollments: true, assignments: true } },
      },
    });

    return NextResponse.json(courses);
  } catch (err) {
    console.error("GET /api/courses/mine error:", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
