// tests/fixtures/courses.ts
// Shared course fixtures for unit, integration, and smoke tests

import { TUTOR } from "./users";

export const COURSE_MATH = {
  id: 1,
  title: "Mathematics 101",
  subject: "Mathematics",
  description: "Intro to calculus and algebra",
  tutorId: TUTOR.id,
  isPublished: true,
  capacity: 30,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const COURSE_PHYSICS = {
  id: 2,
  title: "Physics 201",
  subject: "Physics",
  description: "Classical mechanics",
  tutorId: TUTOR.id,
  isPublished: true,
  capacity: 20,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const COURSE_UNPUBLISHED = {
  id: 3,
  title: "Draft Course",
  subject: "Chemistry",
  description: "Not yet published",
  tutorId: TUTOR.id,
  isPublished: false,
  capacity: 10,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};
