import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuthenticatedUser,
  requireResourceOwner,
  requireTutorRole,
} from "@/lib/api-auth";

// PATCH /api/submissions/[id]/review
// tutor grades a submission and gives feedback
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const tutor = requireTutorRole(auth, "Only tutors can review submissions");
    if (tutor instanceof Response) return tutor;

    const submissionId = Number(params.id);
    if (Number.isNaN(submissionId)) {
      return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    // grade can be null if they just want to leave feedback
    let grade = null;
    if (body.grade !== undefined && body.grade !== null && body.grade !== "") {
      grade = Number(body.grade);
    }
    const feedback = (body.feedback || "").trim() || null;

    // get the submission and make sure the tutor owns the course
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { course: { select: { tutorId: true } } },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const ownership = requireResourceOwner({
      ownerId: submission.assignment.course.tutorId,
      userId: tutor.sub,
      errorMessage: "You do not own this course",
    });
    if (ownership instanceof Response) return ownership;

    // update the submission with grade/feedback
    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: { grade, feedback, reviewedAt: new Date() },
    });

    return NextResponse.json({ success: true, submission: updated });
  } catch (err) {
    console.error("PATCH /api/submissions/[id]/review error:", err);
    return NextResponse.json({ error: "Failed to review submission" }, { status: 500 });
  }
}
