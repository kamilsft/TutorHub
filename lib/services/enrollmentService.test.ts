// lib/services/enrollmentService.test.ts
// Unit tests for enrollmentService (FR6, NFR2, NFR6)
// Layer: Service (business logic) — repository layer is mocked; no real DB touched

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/enrollmentRepository", () => ({
  findEnrollment: vi.fn(),
  countActiveEnrollments: vi.fn(),
  createEnrollment: vi.fn(),
}));
vi.mock("@/lib/repositories/courseRepository", () => ({
  findCourseById: vi.fn(),
}));

import * as enrollmentRepo from "@/lib/repositories/enrollmentRepository";
import * as courseRepo from "@/lib/repositories/courseRepository";
import { enrollStudent } from "./enrollmentService";

describe("enrollmentService (FR6 + NFR2 + NFR6)", () => {
  beforeEach(() => vi.clearAllMocks());

  // NFR4: courseId is required to know which course to enroll in — missing it is rejected immediately
  it("throws 400 when courseId is missing (NFR6)", async () => {
    await expect(enrollStudent("student-1", {}))
      .rejects.toMatchObject({ status: 400, message: "courseId is required" });
  });

  // Resource existence: a student cannot enroll in a course that doesn't exist
  it("throws 404 when course does not exist (FR6)", async () => {
    vi.mocked(courseRepo.findCourseById).mockResolvedValue(null);
    await expect(enrollStudent("student-1", { courseId: 99 }))
      .rejects.toMatchObject({ status: 404 });
  });

  // FR4: unpublished (archived) courses must not accept new enrollments —
  // returns 404 so the existence of the draft course is not leaked
  it("throws 404 when course is not published (FR6)", async () => {
    vi.mocked(courseRepo.findCourseById).mockResolvedValue({ id: 1, isPublished: false } as any);
    await expect(enrollStudent("student-1", { courseId: 1 }))
      .rejects.toMatchObject({ status: 404 });
  });

  // FR4 idempotency: re-enrolling in a course the student already attends should be a no-op —
  // the existing enrollment is returned with alreadyEnrolled=true; no duplicate record is created
  it("returns existing enrollment without error when already enrolled (FR6)", async () => {
    vi.mocked(courseRepo.findCourseById).mockResolvedValue({ id: 1, isPublished: true, capacity: null } as any);
    vi.mocked(enrollmentRepo.findEnrollment).mockResolvedValue({ id: 5, status: "ACTIVE" } as any);

    const result = await enrollStudent("student-1", { courseId: 1 });
    expect(result.alreadyEnrolled).toBe(true);
    expect(enrollmentRepo.createEnrollment).not.toHaveBeenCalled();
  });

  // FR4: a course that has reached its capacity must refuse additional enrollments —
  // current enrollment count equals the capacity limit
  it("throws 400 when course is at capacity (FR6)", async () => {
    vi.mocked(courseRepo.findCourseById).mockResolvedValue({ id: 1, isPublished: true, capacity: 2 } as any);
    vi.mocked(enrollmentRepo.findEnrollment).mockResolvedValue(null);
    vi.mocked(enrollmentRepo.countActiveEnrollments).mockResolvedValue(2); // at limit

    await expect(enrollStudent("student-1", { courseId: 1 }))
      .rejects.toMatchObject({ status: 400, message: "Course is full" });
  });

  // NFR2: the studentId must always come from the verified JWT, never from the request body —
  // this prevents a student from enrolling as a different user by injecting their ID into the body
  it("creates enrollment using JWT studentId — never from body (NFR2)", async () => {
    vi.mocked(courseRepo.findCourseById).mockResolvedValue({ id: 1, isPublished: true, capacity: null } as any);
    vi.mocked(enrollmentRepo.findEnrollment).mockResolvedValue(null);
    vi.mocked(enrollmentRepo.createEnrollment).mockResolvedValue({ id: 1, studentId: "student-1" } as any);

    const result = await enrollStudent("student-1", { courseId: 1, studentId: "injected" });
    expect(result.alreadyEnrolled).toBe(false);
    expect(enrollmentRepo.createEnrollment).toHaveBeenCalledWith("student-1", 1);
  });

  // FR4 happy path: all conditions met (published course, under capacity, not yet enrolled) —
  // a new enrollment record is created
  it("succeeds when course has capacity and student is not enrolled (FR6)", async () => {
    vi.mocked(courseRepo.findCourseById).mockResolvedValue({ id: 1, isPublished: true, capacity: 10 } as any);
    vi.mocked(enrollmentRepo.findEnrollment).mockResolvedValue(null);
    vi.mocked(enrollmentRepo.countActiveEnrollments).mockResolvedValue(5); // under limit
    vi.mocked(enrollmentRepo.createEnrollment).mockResolvedValue({ id: 1 } as any);

    const result = await enrollStudent("student-1", { courseId: 1 });
    expect(result.alreadyEnrolled).toBe(false);
    expect(enrollmentRepo.createEnrollment).toHaveBeenCalled();
  });
});
