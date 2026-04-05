// lib/services/submissionService.test.ts
// Unit tests for submissionService (FR8, FR9, NFR2, NFR4)
// Layer: Service (business logic) — repository layer is mocked; no real DB touched

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/submissionRepository", () => ({
  findSubmissions: vi.fn(),
  findExistingSubmission: vi.fn(),
  createSubmission: vi.fn(),
  updateSubmission: vi.fn(),
  findSubmissionWithCourse: vi.fn(),
  reviewSubmission: vi.fn(),
}));

vi.mock("@/lib/repositories/assignmentRepository", () => ({
  findAssignmentCourseId: vi.fn(),
}));

vi.mock("@/lib/repositories/courseRepository", () => ({
  findCourseById: vi.fn(),
  findActiveEnrollment: vi.fn(),
}));

import * as submissionRepo from "@/lib/repositories/submissionRepository";
import * as assignmentRepo from "@/lib/repositories/assignmentRepository";
import * as courseRepo from "@/lib/repositories/courseRepository";
import { listSubmissions, submitWork, reviewSubmission } from "./submissionService";

describe("submissionService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── listSubmissions ───────────────────────────────────────────────────────
  describe("listSubmissions (FR8 + NFR2)", () => {
    // NFR4: at least one of assignmentId or courseId must be provided —
    // an unbounded query would return all submissions in the system
    it("throws 400 when neither assignmentId nor courseId is given (NFR4)", async () => {
      await expect(listSubmissions("s1", "STUDENT", 0, 0))
        .rejects.toMatchObject({ status: 400 });
    });

    // NFR2 data isolation: student queries must be scoped to their own studentId —
    // a student must never see another student's submission
    it("adds studentId to where clause for students (NFR2 — data isolation)", async () => {
      vi.mocked(submissionRepo.findSubmissions).mockResolvedValue([]);
      await listSubmissions("student-1", "STUDENT", 1, 0);
      expect(submissionRepo.findSubmissions).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: "student-1" })
      );
    });

    // NFR2: a tutor must only see submissions for courses they own —
    // a tutor querying another tutor's course must be blocked
    it("throws 403 when tutor queries a course they do not own (NFR2)", async () => {
      vi.mocked(assignmentRepo.findAssignmentCourseId).mockResolvedValue(3);
      vi.mocked(courseRepo.findCourseById).mockResolvedValue({ tutorId: "other" } as any);
      await expect(listSubmissions("tutor-1", "TUTOR", 1, 0))
        .rejects.toMatchObject({ status: 403 });
    });
  });

  // ── submitWork ────────────────────────────────────────────────────────────
  describe("submitWork (FR8 + NFR2 + NFR4)", () => {
    // NFR4: assignmentId is required to know which assignment the work belongs to
    it("throws 400 when assignmentId is missing (NFR4)", async () => {
      await expect(submitWork("student-1", { content: "answer" }))
        .rejects.toMatchObject({ status: 400, message: "assignmentId is required" });
    });

    // NFR4: content must not be blank — a submission with only whitespace is meaningless
    it("throws 400 when content is empty (NFR4)", async () => {
      await expect(submitWork("student-1", { assignmentId: 1, content: "  " }))
        .rejects.toMatchObject({ status: 400, message: "content is required" });
    });

    // Resource existence: the target assignment must exist before a submission can be created
    it("throws 404 when assignment does not exist", async () => {
      vi.mocked(assignmentRepo.findAssignmentCourseId).mockResolvedValue(null);
      await expect(submitWork("student-1", { assignmentId: 99, content: "answer" }))
        .rejects.toMatchObject({ status: 404 });
    });

    // NFR2: the student must be actively enrolled in the course that owns the assignment —
    // unenrolled students must not be able to submit work
    it("throws 403 when student is not enrolled (NFR2)", async () => {
      vi.mocked(assignmentRepo.findAssignmentCourseId).mockResolvedValue(2);
      vi.mocked(courseRepo.findActiveEnrollment).mockResolvedValue(null);
      await expect(submitWork("student-1", { assignmentId: 1, content: "answer" }))
        .rejects.toMatchObject({ status: 403 });
    });

    // FR8 happy path: first submission creates a new record and returns resubmitted=false
    it("creates new submission on first submit (FR8)", async () => {
      vi.mocked(assignmentRepo.findAssignmentCourseId).mockResolvedValue(2);
      vi.mocked(courseRepo.findActiveEnrollment).mockResolvedValue({ status: "ACTIVE" } as any);
      vi.mocked(submissionRepo.findExistingSubmission).mockResolvedValue(null);
      vi.mocked(submissionRepo.createSubmission).mockResolvedValue({ id: 1 } as any);

      const result = await submitWork("student-1", { assignmentId: 1, content: "My answer" });
      expect(result.resubmitted).toBe(false);
      expect(submissionRepo.createSubmission).toHaveBeenCalled();
    });

    // FR8: a second submission must update the existing record and reset the grade to null —
    // a resubmission invalidates the previously awarded grade
    it("updates existing submission and clears grade on resubmit (FR8)", async () => {
      vi.mocked(assignmentRepo.findAssignmentCourseId).mockResolvedValue(2);
      vi.mocked(courseRepo.findActiveEnrollment).mockResolvedValue({ status: "ACTIVE" } as any);
      vi.mocked(submissionRepo.findExistingSubmission).mockResolvedValue({ id: 5, grade: 90 } as any);
      vi.mocked(submissionRepo.updateSubmission).mockResolvedValue({ id: 5, grade: null } as any);

      const result = await submitWork("student-1", { assignmentId: 1, content: "Updated" });
      expect(result.resubmitted).toBe(true);
      expect(submissionRepo.updateSubmission).toHaveBeenCalledWith(5, "Updated");
    });
  });

  // ── reviewSubmission ──────────────────────────────────────────────────────
  describe("reviewSubmission (FR9 + NFR2 + NFR4)", () => {
    // NFR4: grade must be 0–100; values outside this range are meaningless and rejected
    // (tested here with a clearly out-of-range value)
    it("throws 400 when grade is out of range (NFR4)", async () => {
      await expect(reviewSubmission(1, "tutor-1", { grade: 150 }))
        .rejects.toMatchObject({ status: 400 });
    });

    // Resource existence: the submission must exist before a review can be saved
    it("throws 404 when submission does not exist", async () => {
      vi.mocked(submissionRepo.findSubmissionWithCourse).mockResolvedValue(null);
      await expect(reviewSubmission(99, "tutor-1", { grade: 80 }))
        .rejects.toMatchObject({ status: 404 });
    });

    // NFR2: only the tutor who owns the course may grade its submissions —
    // a different tutor must be blocked even if they know the submission ID
    it("throws 403 when tutor does not own the course (NFR2)", async () => {
      vi.mocked(submissionRepo.findSubmissionWithCourse).mockResolvedValue({
        id: 1,
        assignment: { course: { tutorId: "other-tutor" } },
      } as any);
      await expect(reviewSubmission(1, "tutor-1", { grade: 80 }))
        .rejects.toMatchObject({ status: 403 });
    });

    // FR9 happy path: owning tutor provides a valid grade and feedback; both are persisted
    it("saves grade and feedback when tutor owns the course (FR9)", async () => {
      vi.mocked(submissionRepo.findSubmissionWithCourse).mockResolvedValue({
        id: 1,
        assignment: { course: { tutorId: "tutor-1" } },
      } as any);
      vi.mocked(submissionRepo.reviewSubmission).mockResolvedValue({ id: 1, grade: 88 } as any);

      const result = await reviewSubmission(1, "tutor-1", { grade: 88, feedback: "Good" });
      expect(submissionRepo.reviewSubmission).toHaveBeenCalledWith(1, 88, "Good");
      expect(result).toMatchObject({ grade: 88 });
    });

    // NFR4 lower boundary: grade=0 is a valid score (not a missing grade) and must be accepted
    it("accepts grade=0 as valid boundary value (NFR4)", async () => {
      vi.mocked(submissionRepo.findSubmissionWithCourse).mockResolvedValue({
        id: 1,
        assignment: { course: { tutorId: "tutor-1" } },
      } as any);
      vi.mocked(submissionRepo.reviewSubmission).mockResolvedValue({ id: 1, grade: 0 } as any);
      await expect(reviewSubmission(1, "tutor-1", { grade: 0 })).resolves.not.toThrow();
    });

    // NFR4 upper boundary: grade=100 is a perfect score and must be accepted
    it("accepts grade=100 as valid boundary value (NFR4)", async () => {
      vi.mocked(submissionRepo.findSubmissionWithCourse).mockResolvedValue({
        id: 1,
        assignment: { course: { tutorId: "tutor-1" } },
      } as any);
      vi.mocked(submissionRepo.reviewSubmission).mockResolvedValue({ id: 1, grade: 100 } as any);
      await expect(reviewSubmission(1, "tutor-1", { grade: 100 })).resolves.not.toThrow();
    });

    // NFR4 boundary: grade=-1 is one below the minimum and must be rejected
    it("throws 400 when grade is -1 (NFR4)", async () => {
      await expect(reviewSubmission(1, "tutor-1", { grade: -1 }))
        .rejects.toMatchObject({ status: 400 });
    });

    // NFR4 boundary: grade=101 is one above the maximum and must be rejected
    it("throws 400 when grade is 101 (NFR4)", async () => {
      await expect(reviewSubmission(1, "tutor-1", { grade: 101 }))
        .rejects.toMatchObject({ status: 400 });
    });

    // NFR4: grade is optional — a tutor may leave written feedback without assigning a numeric grade
    it("accepts feedback-only review with no grade (NFR4)", async () => {
      vi.mocked(submissionRepo.findSubmissionWithCourse).mockResolvedValue({
        id: 1,
        assignment: { course: { tutorId: "tutor-1" } },
      } as any);
      vi.mocked(submissionRepo.reviewSubmission).mockResolvedValue({ id: 1, grade: null, feedback: "Good effort" } as any);
      await expect(reviewSubmission(1, "tutor-1", { feedback: "Good effort" })).resolves.not.toThrow();
    });
  });
});
