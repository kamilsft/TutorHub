// tests/fixtures/messages.ts
// Shared message fixtures for unit, integration, and smoke tests

import { STUDENT, TUTOR } from "./users";

export const MESSAGE_STUDENT_TO_TUTOR = {
  id: "msg-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  senderId: STUDENT.id,
  receiverId: TUTOR.id,
  content: "Hi, I have a question about the homework.",
  isRead: false,
  createdAt: new Date("2024-03-01T10:00:00Z"),
};

export const MESSAGE_TUTOR_TO_STUDENT = {
  id: "msg-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  senderId: TUTOR.id,
  receiverId: STUDENT.id,
  content: "Sure, feel free to ask!",
  isRead: true,
  createdAt: new Date("2024-03-01T10:05:00Z"),
};

export const MESSAGE_UNREAD = {
  id: "msg-cccc-cccc-cccc-cccccccccccc",
  senderId: TUTOR.id,
  receiverId: STUDENT.id,
  content: "Don't forget the deadline is tomorrow.",
  isRead: false,
  createdAt: new Date("2024-03-02T09:00:00Z"),
};
