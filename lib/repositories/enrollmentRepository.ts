// lib/repositories/enrollmentRepository.ts
// All Prisma calls for course enrollment live here
// NFR15 (maintainability), NFR13 (testability)

import { prisma } from "@/lib/prisma";

// FR6 - check whether a student is already enrolled in a course
export async function findEnrollment(studentId: string, courseId: number) {
  return prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } as any },
  });
}

// FR6 - count active enrollments for a course (used to enforce capacity)
export async function countActiveEnrollments(courseId: number): Promise<number> {
  return prisma.enrollment.count({ where: { courseId, status: "ACTIVE" } });
}

// FR6 - create a new enrollment for a student
export async function createEnrollment(studentId: string, courseId: number) {
  return prisma.enrollment.create({
    data: { studentId, courseId, status: "ACTIVE" },
  });
}
