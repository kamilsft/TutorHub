// lib/repositories/assignmentRepository.ts
// All Prisma calls for assignments live here
// NFR15 (maintainability), NFR13 (testability)

import { prisma } from "@/lib/prisma";

export interface AssignmentCreateData {
  courseId: number;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
}

// FR7 - get all assignments for a course, newest first
export async function findAssignmentsByCourse(courseId: number) {
  return prisma.assignment.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { id: true, title: true, subject: true } },
      _count: { select: { submissions: true } },
    },
  });
}

// FR7 - get one assignment; tutors see all submissions, students see only their own
export async function findAssignmentByIdForTutor(id: number) {
  return prisma.assignment.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, subject: true, tutorId: true } },
      submissions: {
        include: { student: { select: { id: true, fullName: true, email: true } } },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
}

export async function findAssignmentByIdForStudent(id: number, studentId: string) {
  return prisma.assignment.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, subject: true, tutorId: true } },
      // NFR2 - only this student's own submissions are included
      submissions: { where: { studentId } },
    },
  });
}

// FR7 - create a new assignment
export async function createAssignment(data: AssignmentCreateData) {
  return prisma.assignment.create({ data });
}

// Helper for ownership checks - just fetches the assignment's courseId
export async function findAssignmentCourseId(id: number): Promise<number | null> {
  const a = await prisma.assignment.findUnique({ where: { id }, select: { courseId: true } });
  return a?.courseId ?? null;
}
