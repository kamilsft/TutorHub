// lib/services/assignmentService.test.ts
// Unit tests for assignmentService (FR7, NFR2, NFR4)
// Layer: Service (business logic) — repository layer is mocked; no real DB touched

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/assignmentRepository", () => ({
  findAssignmentsByCourse: vi.fn(),
  findAssignmentByIdForTutor: vi.fn(),
  findAssignmentByIdForStudent: vi.fn(),
  createAssignment: vi.fn(),
  findAssignmentCourseId: vi.fn(),
}));

vi.mock("@/lib/repositories/courseRepository", () => ({
  findCourseById: vi.fn(),
  findActiveEnrollment: vi.fn(),
}));

import * as assignmentRepo from "@/lib/repositories/assignmentRepository";
import * as courseRepo from "@/lib/repositories/courseRepository";
import { listAssignments, getAssignment, createAssignment } from "./assignmentService";

const mockCourse = { id: 1, tutorId: "tutor-1" };
const mockAssignment = { id: 10, courseId: 1, title: "HW1", course: { tutorId: "tutor-1" }, submissions: [] };

describe("assignmentService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── listAssignments ───────────────────────────────────────────────────────
  describe("listAssignments (FR7 + NFR2)", () => {
    // NFR2: a student who is not actively enrolled must be blocked from reading assignments —
    // prevents unenrolled users from accessing course content they haven't paid for
    it("throws 403 when student is not enrolled (NFR2)", async () => {
      vi.mocked(courseRepo.findActiveEnrollment).mockResolvedValue(null);
      await expect(listAssignments(1, "student-1", "STUDENT"))
        .rejects.toMatchObject({ status: 403 });
    });

    // NFR2: a tutor who doesn't own the course must not see its assignments —
    // tutors should only manage their own courses
    it("throws 403 when tutor does not own the course (NFR2)", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue({ tutorId: "other" } as any);
      await expect(listAssignments(1, "tutor-1", "TUTOR"))
        .rejects.toMatchObject({ status: 403 });
    });

    // FR7 happy path: enrolled student receives the full assignment list
    it("returns assignments for an enrolled student (FR7)", async () => {
      vi.mocked(courseRepo.findActiveEnrollment).mockResolvedValue({ status: "ACTIVE" } as any);
      vi.mocked(assignmentRepo.findAssignmentsByCourse).mockResolvedValue([mockAssignment] as any);
      const result = await listAssignments(1, "student-1", "STUDENT");
      expect(result).toHaveLength(1);
    });

    // FR7 happy path: the owning tutor can see their own course's assignments
    it("returns assignments for the owning tutor (FR7)", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue(mockCourse as any);
      vi.mocked(assignmentRepo.findAssignmentsByCourse).mockResolvedValue([mockAssignment] as any);
      const result = await listAssignments(1, "tutor-1", "TUTOR");
      expect(result).toHaveLength(1);
    });
  });

  // ── createAssignment ──────────────────────────────────────────────────────
  describe("createAssignment (FR7 + NFR2 + NFR4)", () => {
    // NFR4: title is a required field — must be caught before touching the DB
    it("throws 400 when title is missing (NFR4)", async () => {
      await expect(createAssignment("tutor-1", { courseId: 1 }))
        .rejects.toMatchObject({ status: 400, message: "title is required" });
    });

    // NFR4: courseId is required — an assignment with no course is invalid
    it("throws 400 when courseId is missing (NFR4)", async () => {
      await expect(createAssignment("tutor-1", { title: "HW" }))
        .rejects.toMatchObject({ status: 400 });
    });

    // NFR2: tutors may only add assignments to courses they own —
    // creating assignments in another tutor's course is forbidden
    it("throws 403 when tutor does not own the course (NFR2)", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue({ tutorId: "other" } as any);
      await expect(createAssignment("tutor-1", { courseId: 1, title: "HW" }))
        .rejects.toMatchObject({ status: 403 });
    });

    // FR7 happy path: owning tutor provides all required fields; assignment is persisted
    it("creates assignment when tutor owns the course (FR7)", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue(mockCourse as any);
      vi.mocked(assignmentRepo.createAssignment).mockResolvedValue(mockAssignment as any);
      const result = await createAssignment("tutor-1", { courseId: 1, title: "HW1" });
      expect(assignmentRepo.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ courseId: 1, title: "HW1" })
      );
      expect(result).toMatchObject({ title: "HW1" });
    });

    // NFR4: dueDate must be a parseable ISO date string — garbage strings are rejected
    // before any DB write so we never persist an invalid deadline
    it("rejects a dueDate that is not a valid date string (NFR4)", async () => {
      await expect(createAssignment("tutor-1", { courseId: 1, title: "HW", dueDate: "not-a-date" }))
        .rejects.toMatchObject({ status: 400 });
    });

    // NFR4: title length cap at 300 chars — prevents excessively long titles from being stored
    it("throws 400 when title exceeds 300 characters (NFR4)", async () => {
      const longTitle = "T".repeat(301);
      await expect(createAssignment("tutor-1", { courseId: 1, title: longTitle }))
        .rejects.toMatchObject({ status: 400, message: "title must be 300 characters or fewer" });
    });
  });

  // ── getAssignment ─────────────────────────────────────────────────────────
  describe("getAssignment (FR7 + NFR2)", () => {
    // Resource existence check — 404 must be returned before any ownership check runs
    it("throws 404 when assignment does not exist", async () => {
      vi.mocked(assignmentRepo.findAssignmentByIdForTutor).mockResolvedValue(null);
      await expect(getAssignment(99, "tutor-1", "TUTOR"))
        .rejects.toMatchObject({ status: 404 });
    });

    // NFR2: tutor A must not be able to view assignments belonging to tutor B's course
    it("throws 403 when tutor does not own the course (NFR2)", async () => {
      vi.mocked(assignmentRepo.findAssignmentByIdForTutor).mockResolvedValue({
        ...mockAssignment, course: { tutorId: "other" },
      } as any);
      await expect(getAssignment(10, "tutor-1", "TUTOR"))
        .rejects.toMatchObject({ status: 403 });
    });

    // FR7: the owning tutor can retrieve the assignment successfully
    it("returns assignment to the owning tutor (FR7)", async () => {
      vi.mocked(assignmentRepo.findAssignmentByIdForTutor).mockResolvedValue(mockAssignment as any);
      const result = await getAssignment(10, "tutor-1", "TUTOR");
      expect(result).toMatchObject({ title: "HW1" });
    });

    // FR7 STUDENT path: assignment not found via student repo → 404
    // Covers the else branch (findAssignmentByIdForStudent) in getAssignment line 39
    it("throws 404 when assignment not found for student (FR7 STUDENT path)", async () => {
      vi.mocked(assignmentRepo.findAssignmentByIdForStudent).mockResolvedValue(null);
      await expect(getAssignment(99, "student-1", "STUDENT"))
        .rejects.toMatchObject({ status: 404 });
    });

    // NFR2 STUDENT path: assignment found but student has no active enrollment → 403
    // Covers lines 44-49 in getAssignment
    it("throws 403 when student is not enrolled in the assignment's course (NFR2 STUDENT path)", async () => {
      vi.mocked(assignmentRepo.findAssignmentByIdForStudent).mockResolvedValue({
        ...mockAssignment, courseId: 1,
      } as any);
      vi.mocked(courseRepo.findActiveEnrollment).mockResolvedValue(null);
      await expect(getAssignment(10, "student-1", "STUDENT"))
        .rejects.toMatchObject({ status: 403 });
    });

    // FR7 STUDENT path: enrolled student can retrieve the assignment
    it("returns assignment to enrolled student (FR7 STUDENT path)", async () => {
      vi.mocked(assignmentRepo.findAssignmentByIdForStudent).mockResolvedValue({
        ...mockAssignment, courseId: 1,
      } as any);
      vi.mocked(courseRepo.findActiveEnrollment).mockResolvedValue({ status: "ACTIVE" } as any);
      const result = await getAssignment(10, "student-1", "STUDENT");
      expect(result).toMatchObject({ title: "HW1" });
    });
  });
});
