// tests/fixtures/studyPlans.ts
// Shared study plan and task fixtures for unit, integration, and smoke tests

import { STUDENT, OTHER_STUDENT } from "./users";

export const TASK_INCOMPLETE = {
  id: 1,
  studyPlanId: 1,
  title: "Read Chapter 3",
  completed: false,
  courseId: null,
};

export const TASK_COMPLETE = {
  id: 2,
  studyPlanId: 1,
  title: "Solve Practice Problems",
  completed: true,
  courseId: null,
};

export const STUDY_PLAN = {
  id: 1,
  studentId: STUDENT.id,
  createdAt: new Date("2024-04-01"),
  updatedAt: new Date("2024-04-01"),
  tasks: [TASK_INCOMPLETE, TASK_COMPLETE],
};

export const OTHER_STUDY_PLAN = {
  id: 2,
  studentId: OTHER_STUDENT.id,
  createdAt: new Date("2024-04-02"),
  updatedAt: new Date("2024-04-02"),
  tasks: [],
};
