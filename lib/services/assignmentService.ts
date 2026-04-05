// lib/services/assignmentService.ts
// Business logic for assignments
// NFR15 - routes stay thin; all rules live here

import * as assignmentRepo from "@/lib/repositories/assignmentRepository";
import * as courseRepo from "@/lib/repositories/courseRepository";
import { validateAssignmentInput } from "@/lib/validators/assessmentValidator";

// FR7 + NFR2 - get assignments for a course
// students must be enrolled; tutors must own the course
export async function listAssignments(courseId: number, requesterId: string, requesterRole: string) {
  if (requesterRole === "STUDENT") {
    // NFR2 - student must have an active enrollment
    const enrollment = await courseRepo.findActiveEnrollment(requesterId, courseId);
    if (!enrollment || enrollment.status !== "ACTIVE") {
      throw { status: 403, message: "You are not enrolled in this course" };
    }
  }

  if (requesterRole === "TUTOR") {
    // NFR2 - tutor must own the course
    const course = await courseRepo.findCourseById(courseId);
    if (!course || course.tutorId !== requesterId) {
      throw { status: 403, message: "You do not own this course" };
    }
  }

  return assignmentRepo.findAssignmentsByCourse(courseId);
}

// FR7 + NFR2 - get a single assignment
// tutors see all submissions; students see only their own
export async function getAssignment(id: number, requesterId: string, requesterRole: string) {
  let assignment;

  if (requesterRole === "TUTOR") {
    assignment = await assignmentRepo.findAssignmentByIdForTutor(id);
  } else {
    assignment = await assignmentRepo.findAssignmentByIdForStudent(id, requesterId);
  }

  if (!assignment) throw { status: 404, message: "Assignment not found" };

  if (requesterRole === "STUDENT") {
    // NFR2 - student must be enrolled to view
    const enrollment = await courseRepo.findActiveEnrollment(requesterId, assignment.courseId);
    if (!enrollment || enrollment.status !== "ACTIVE") {
      throw { status: 403, message: "You are not enrolled in this course" };
    }
  }

  if (requesterRole === "TUTOR" && assignment.course.tutorId !== requesterId) {
    // NFR2 - tutor must own the course
    throw { status: 403, message: "You do not own this course" };
  }

  return assignment;
}

// FR7 + NFR2 + NFR4 - create an assignment for a course the tutor owns
export async function createAssignment(tutorId: string, body: any) {
  // NFR4 - validate before touching the database
  const error = validateAssignmentInput(body);
  if (error) throw { status: 400, message: error };

  const courseId = Number(body.courseId);

  // NFR2 - tutor must own the course they're adding an assignment to
  const course = await courseRepo.findCourseById(courseId);
  if (!course || course.tutorId !== tutorId) {
    throw { status: 403, message: "You do not own this course" };
  }

  return assignmentRepo.createAssignment({
    courseId,
    title: body.title.toString().trim(),
    description: (body.description || "").trim() || null,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
  });
}
