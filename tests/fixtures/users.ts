// tests/fixtures/users.ts
// Shared user fixtures for unit, integration, and smoke tests
// Provides predictable IDs and tokens for STUDENT, TUTOR, and ADMIN roles

import { signToken } from "@/lib/jwt";

export const STUDENT = {
  id: "fixture-student-aaaa-aaaa-aaaaaaaaaaaa",
  fullName: "Alice Student",
  email: "alice@fixture.test",
  role: "STUDENT" as const,
};

export const TUTOR = {
  id: "fixture-tutor-bbbb-bbbb-bbbbbbbbbbbb",
  fullName: "Bob Tutor",
  email: "bob@fixture.test",
  role: "TUTOR" as const,
};

export const ADMIN = {
  id: "fixture-admin-cccc-cccc-cccccccccccc",
  fullName: "Carol Admin",
  email: "carol@fixture.test",
  role: "ADMIN" as const,
};

export const OTHER_STUDENT = {
  id: "fixture-student-dddd-dddd-dddddddddddd",
  fullName: "Dave Student",
  email: "dave@fixture.test",
  role: "STUDENT" as const,
};

/** Returns a Bearer token string for use in Authorization headers */
export function tokenFor(user: { id: string; role: string }): string {
  return `Bearer ${signToken(user.id, user.role)}`;
}
