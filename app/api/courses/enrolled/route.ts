import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/api-auth";

// GET /api/courses/enrolled
// returns the courses the logged in student is enrolled in
export async function GET(request: Request) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;

    if (auth.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students can access this" }, { status: 403 });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: auth.sub, status: "ACTIVE" },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            subject: true,
            level: true,
            tutor: { select: { fullName: true } },
            _count: { select: { assignments: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    // flatten it so the frontend just gets course objects
    const courses = enrollments.map((e) => ({
      ...e.course,
      enrolledAt: e.enrolledAt,
    }));

    return NextResponse.json(courses);
  } catch (err) {
    console.error("GET /api/courses/enrolled error:", err);
    return NextResponse.json({ error: "Failed to fetch enrolled courses" }, { status: 500 });
  }
}
