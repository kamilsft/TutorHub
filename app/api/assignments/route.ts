import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuthenticatedUser,
  requireResourceOwner,
  requireTutorRole,
} from "@/lib/api-auth";
import { isServiceError } from "@/lib/services/service-error";
import { validateAssignmentPayload } from "@/lib/validation";

// GET /api/assignments?courseId=___
// fetches all assignments for a specific course
export async function GET(request: Request) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const courseId = Number(searchParams.get("courseId") || 0);
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    // if student, make sure theyre actually enrolled
    if (auth.role === "STUDENT") {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: auth.sub, courseId } as any },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
      }
    }

    // if tutor, check they own the course
    if (auth.role === "TUTOR") {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      const ownership = requireResourceOwner({
        ownerId: course?.tutorId,
        userId: auth.sub,
        errorMessage: "You do not own this course",
      });
      if (ownership instanceof Response) return ownership;
    }

    if (auth.role !== "STUDENT" && auth.role !== "TUTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { id: true, title: true, subject: true } },
        _count: { select: { submissions: true } },
      }
    });

    return NextResponse.json(assignments);
  } catch (err) {
    console.error("GET /api/assignments error:", err);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

// POST /api/assignments  - only tutors can create
// body: { courseId, title, description?, dueDate? }
export async function POST(request: Request) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const tutor = requireTutorRole(auth, "Only tutors can create assignments");
    if (tutor instanceof Response) return tutor;

    const { courseId, title, description, dueDate } = validateAssignmentPayload(
      await request.json().catch(() => ({}))
    );

    // make sure the tutor actually owns this course
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    const ownership = requireResourceOwner({
      ownerId: course?.tutorId,
      userId: tutor.sub,
      errorMessage: "You do not own this course",
    });
    if (ownership instanceof Response) return ownership;

    const assignment = await prisma.assignment.create({
      data: { courseId, title, description, dueDate },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/assignments error:", err);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
