import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/api-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const courseId = Number(body.courseId || 0);
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    if (auth.role !== "STUDENT") return NextResponse.json({ error: "Only students can enroll" }, { status: 403 });

    const studentId = auth.sub;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || !course.isPublished) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // Check for existing enrollment (unique composite studentId+courseId)
    const existing = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } as any },
    });
    if (existing) {
      return NextResponse.json({ error: "Already enrolled", enrollment: existing }, { status: 200 });
    }

    // Check capacity
    if (course.capacity) {
      const activeCount = await prisma.enrollment.count({
        where: { courseId, status: "ACTIVE" },
      });
      if (activeCount >= course.capacity) {
        return NextResponse.json({ error: "Course is full" }, { status: 400 });
      }
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        courseId,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, enrollment }, { status: 201 });
  } catch (err) {
    console.error("POST /api/enrollments error", err);
    return NextResponse.json({ error: "Failed to enroll" }, { status: 500 });
  }
}
