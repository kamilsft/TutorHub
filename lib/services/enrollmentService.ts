// lib/services/enrollmentService.ts
// Business logic for course enrollment
// NFR15 - route stays thin; all rules live here

import * as enrollmentRepo from "@/lib/repositories/enrollmentRepository";
import * as courseRepo from "@/lib/repositories/courseRepository";

// FR6 + NFR2 + NFR4 - enroll a student in a course
// studentId always comes from the JWT — can never be injected from the request body
export async function enrollStudent(studentId: string, body: any) {
  const courseId = Number(body.courseId || 0);

  // NFR4 - courseId must be present and numeric
  if (!courseId) throw { status: 400, message: "courseId is required" };

  // FR6 - course must exist and be published for enrollment to be allowed
  const course = await courseRepo.findCourseById(courseId);
  if (!course || !course.isPublished) {
    throw { status: 404, message: "Course not found" };
  }

  // FR6 - return existing enrollment rather than erroring if already enrolled
  const existing = await enrollmentRepo.findEnrollment(studentId, courseId);
  if (existing) {
    return { enrollment: existing, alreadyEnrolled: true };
  }

  // FR6 - enforce capacity limit if one is set on the course
  if (course.capacity) {
    const activeCount = await enrollmentRepo.countActiveEnrollments(courseId);
    if (activeCount >= course.capacity) {
      throw { status: 400, message: "Course is full" };
    }
  }

  // FR6 - create the enrollment using the verified JWT student identity
  const enrollment = await enrollmentRepo.createEnrollment(studentId, courseId);
  return { enrollment, alreadyEnrolled: false };
}
