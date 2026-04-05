// lib/services/submissionService.ts
// Business logic for student submissions and tutor reviews
// NFR15 - keeps route files thin; all business rules centralised here

import * as submissionRepo from "@/lib/repositories/submissionRepository";
import * as assignmentRepo from "@/lib/repositories/assignmentRepository";
import * as courseRepo from "@/lib/repositories/courseRepository";
import {
  validateSubmissionInput,
  validateReviewInput,
} from "@/lib/validators/assessmentValidator";

// FR8 + NFR2 - get submissions
// students see only their own; tutors see all — but only for courses they own
export async function listSubmissions(
  requesterId: string,
  requesterRole: string,
  assignmentId: number,
  courseId: number
) {
  if (!assignmentId && !courseId) {
    throw { status: 400, message: "assignmentId or courseId is required" };
  }

  const where: Record<string, unknown> = {};
  if (assignmentId) where.assignmentId = assignmentId;
  if (courseId) where.assignment = { courseId };

  // NFR2 - students can only see their own submissions
  if (requesterRole === "STUDENT") {
    where.studentId = requesterId;
  }

  // NFR2 - tutors must own the course before seeing any submissions
  if (requesterRole === "TUTOR") {
    let targetCourseId = courseId;
    if (!targetCourseId && assignmentId) {
      const cid = await assignmentRepo.findAssignmentCourseId(assignmentId);
      if (cid) targetCourseId = cid;
    }
    if (targetCourseId) {
      const course = await courseRepo.findCourseById(targetCourseId);
      if (!course || course.tutorId !== requesterId) {
        throw { status: 403, message: "You do not own this course" };
      }
    }
  }

  return submissionRepo.findSubmissions(where);
}

// FR8 + NFR2 + NFR4 - student submits work; handles create and resubmit
export async function submitWork(studentId: string, body: any) {
  const assignmentId = Number(body.assignmentId || 0);
  if (!assignmentId) throw { status: 400, message: "assignmentId is required" };

  // NFR4 - content must not be empty
  const validationError = validateSubmissionInput(body);
  if (validationError) throw { status: 400, message: validationError };

  const content = body.content.trim();

  // check the assignment exists
  const courseId = await assignmentRepo.findAssignmentCourseId(assignmentId);
  if (courseId === null) throw { status: 404, message: "Assignment not found" };

  // NFR2 - student must be actively enrolled
  const enrollment = await courseRepo.findActiveEnrollment(studentId, courseId);
  if (!enrollment || enrollment.status !== "ACTIVE") {
    throw { status: 403, message: "You must be enrolled in the course to submit" };
  }

  // FR8 - resubmit if a submission already exists; this clears the old grade
  const existing = await submissionRepo.findExistingSubmission(assignmentId, studentId);
  if (existing) {
    const submission = await submissionRepo.updateSubmission(existing.id, content);
    return { submission, resubmitted: true };
  }

  const submission = await submissionRepo.createSubmission(assignmentId, studentId, content);
  return { submission, resubmitted: false };
}

// FR9 + NFR2 + NFR4 - tutor reviews a submission
export async function reviewSubmission(submissionId: number, tutorId: string, body: any) {
  // NFR4 - grade must be 0–100 if supplied
  const validationError = validateReviewInput(body);
  if (validationError) throw { status: 400, message: validationError };

  let grade: number | null = null;
  if (body.grade !== undefined && body.grade !== null && body.grade !== "") {
    grade = Number(body.grade);
  }
  const feedback = (body.feedback || "").trim() || null;

  // load the submission and join all the way to the course
  const submission = await submissionRepo.findSubmissionWithCourse(submissionId);
  if (!submission) throw { status: 404, message: "Submission not found" };

  // NFR2 - tutor must own the course this submission belongs to
  if (submission.assignment.course.tutorId !== tutorId) {
    throw { status: 403, message: "You do not own this course" };
  }

  return submissionRepo.reviewSubmission(submissionId, grade, feedback);
}
