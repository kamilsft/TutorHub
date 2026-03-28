import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuthenticatedUser,
  requireResourceOwner,
} from "@/lib/api-auth";
import { isServiceError } from "@/lib/services/service-error";
import { validateSubmissionPayload } from "@/lib/validation";

// GET /api/submissions?assignmentId=1  or  ?courseId=1
// tutors see all submissions for their course, students only see their own
export async function GET(request: Request) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const assignmentId = Number(searchParams.get("assignmentId") || 0);
    const courseId = Number(searchParams.get("courseId") || 0);

    if (!assignmentId && !courseId) {
      return NextResponse.json({ error: "assignmentId or courseId is required" }, { status: 400 });
    }

    // build where clause
    const where: any = {};
    if (assignmentId) where.assignmentId = assignmentId;
    if (courseId) where.assignment = { courseId };

    // students only see their own submissions
    if (auth.role === "STUDENT") {
      where.studentId = auth.sub;
    }

    // tutors - verify they own the course before returning anything
    if (auth.role === "TUTOR") {
      // figure out which course this is for
      let targetCourseId = courseId;
      if (!targetCourseId && assignmentId) {
        const asgn = await prisma.assignment.findUnique({ where: { id: assignmentId } });
        if (asgn) targetCourseId = asgn.courseId;
      }
      if (targetCourseId) {
        const course = await prisma.course.findUnique({ where: { id: targetCourseId } });
        const ownership = requireResourceOwner({
          ownerId: course?.tutorId,
          userId: auth.sub,
          errorMessage: "You do not own this course",
        });
        if (ownership instanceof Response) return ownership;
      }
    }

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        assignment: {
          select: {
            id: true, title: true, courseId: true,
            course: { select: { title: true } },
          },
        },
      },
    });

    return NextResponse.json(submissions);
  } catch (err) {
    console.error("GET /api/submissions error:", err);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

// POST /api/submissions
// student submits their work for an assignment
// body: { assignmentId, content }
export async function POST(request: Request) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;

    if (auth.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students can submit assignments" }, { status: 403 });
    }

    const { assignmentId, content } = validateSubmissionPayload(await request.json().catch(() => ({})));

    // check assignment exists
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // check student is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId: auth.sub, courseId: assignment.courseId } as any,
      },
    });
    if (!enrollment || enrollment.status !== "ACTIVE") {
      return NextResponse.json({ error: "You must be enrolled in the course to submit" }, { status: 403 });
    }

    // check if they already submitted - if so, update it (resubmit)
    const existing = await prisma.submission.findFirst({
      where: { assignmentId, studentId: auth.sub },
    });

    let submission;
    let resubmitted = false;

    if (existing) {
      // update existing submission and clear old review
      submission = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          content,
          submittedAt: new Date(),
          grade: null,
          feedback: null,
          reviewedAt: null,
        },
      });
      resubmitted = true;
    } else {
      submission = await prisma.submission.create({
        data: { assignmentId, studentId: auth.sub, content },
      });
    }

    return NextResponse.json(
      { success: true, submission, resubmitted },
      { status: resubmitted ? 200 : 201 }
    );
  } catch (err) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/submissions error:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
