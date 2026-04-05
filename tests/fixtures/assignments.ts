// tests/fixtures/assignments.ts
// Shared assignment fixtures for unit, integration, and smoke tests

import { COURSE_MATH, COURSE_PHYSICS } from "./courses";

export const ASSIGNMENT_ALGEBRA = {
  id: 1,
  courseId: COURSE_MATH.id,
  title: "Algebra Homework 1",
  description: "Complete exercises 1-10",
  dueDate: new Date("2024-06-01"),
  createdAt: new Date("2024-01-15"),
};

export const ASSIGNMENT_MECHANICS = {
  id: 2,
  courseId: COURSE_PHYSICS.id,
  title: "Mechanics Problem Set",
  description: "Newton's laws problems",
  dueDate: new Date("2024-06-15"),
  createdAt: new Date("2024-01-20"),
};

export const ASSIGNMENT_NO_DUE_DATE = {
  id: 3,
  courseId: COURSE_MATH.id,
  title: "Open-ended Essay",
  description: "Write about your favourite theorem",
  dueDate: null,
  createdAt: new Date("2024-02-01"),
};
