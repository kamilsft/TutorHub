// lib/repositories/submissionRepository.ts
// All Prisma calls for submissions live here
// NFR15 (maintainability), NFR13 (testability)

import { prisma } from "@/lib/prisma";

// FR8 - find all submissions matching a filter (student sees own; tutor sees all for their course)
export async function findSubmissions(where: Record<string, unknown>) {
  return prisma.submission.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    include: {
      student: { select: { id: true, fullName: true, email: true } },
      assignment: {
        select: {
          id: true,
          title: true,
          courseId: true,
          course: { select: { title: true } },
        },
      },
    },
  });
}

// FR8 - check whether a student already submitted this assignment (for resubmit logic)
export async function findExistingSubmission(assignmentId: number, studentId: string) {
  return prisma.submission.findFirst({ where: { assignmentId, studentId } });
}

// FR8 - create a brand new submission
export async function createSubmission(assignmentId: number, studentId: string, content: string) {
  return prisma.submission.create({
    data: { assignmentId, studentId, content },
  });
}

// FR8 - update an existing submission and clear the old grade (resubmit)
export async function updateSubmission(id: number, content: string) {
  return prisma.submission.update({
    where: { id },
    data: { content, submittedAt: new Date(), grade: null, feedback: null, reviewedAt: null },
  });
}

// FR9 - load a submission joined to its assignment → course so we can check tutorId
export async function findSubmissionWithCourse(id: number) {
  return prisma.submission.findUnique({
    where: { id },
    include: {
      assignment: {
        include: { course: { select: { tutorId: true } } },
      },
    },
  });
}

// FR9 - save the tutor's grade and feedback
export async function reviewSubmission(
  id: number,
  grade: number | null,
  feedback: string | null
) {
  return prisma.submission.update({
    where: { id },
    data: { grade, feedback, reviewedAt: new Date() },
  });
}
