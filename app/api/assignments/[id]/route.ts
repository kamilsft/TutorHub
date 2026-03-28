import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireResourceOwner } from "@/lib/api-auth";

// GET /api/assignments/[id]
// returns assignment details + submissions (students see only theirs, tutors see all)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;

    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid assignment id" }, { status: 400 });
    }

    // fetch the assignment - include different stuff depending on role
    let assignment;
    if (auth.role === "TUTOR") {
      assignment = await prisma.assignment.findUnique({
        where: { id },
        include: {
          course: { select: { id: true, title: true, subject: true, tutorId: true } },
          submissions: {
            include: {
              student: { select: { id: true, fullName: true, email: true } },
            },
            orderBy: { submittedAt: "desc" },
          },
        },
      });
    } else {
      // student - only get their own submissions
      assignment = await prisma.assignment.findUnique({
        where: { id },
        include: {
          course: { select: { id: true, title: true, subject: true, tutorId: true } },
          submissions: {
            where: { studentId: auth.sub },
          },
        },
      });
    }

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // check access - student must be enrolled
    if (auth.role === "STUDENT") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: auth.sub, courseId: assignment.courseId } as any,
        },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
      }
    }

    // tutor must own the course
    if (auth.role === "TUTOR") {
      const ownership = requireResourceOwner({
        ownerId: assignment.course.tutorId,
        userId: auth.sub,
        errorMessage: "You do not own this course",
      });
      if (ownership instanceof Response) return ownership;
    }

    if (auth.role !== "STUDENT" && auth.role !== "TUTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(assignment);
  } catch (err) {
    console.error("GET /api/assignments/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 });
  }
}
