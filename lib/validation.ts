import { Role } from "@prisma/client";
import { ServiceError } from "@/lib/services/service-error";

type RegistrationInput = {
  fullName: string;
  email: string;
  password: string;
  role: Role;
};

type LoginInput = {
  email: string;
  password: string;
};

type CourseInput = {
  title: string;
  subject: string;
  description: string | null;
  price: number | null;
  level: string | null;
  isPublished: boolean;
};

type StudyPlanTaskInput = {
  title: string;
  dueDate: Date;
  courseId: number;
  completed: boolean;
};

type StudyPlanCreateInput = {
  sourcePlanId: number;
  tasks?: StudyPlanTaskInput[];
};

type StudyPlanUpdateInput = {
  planId: number;
  tasks: StudyPlanTaskInput[];
};

type TaskStatusInput = {
  completed: boolean;
};

type MessageSendInput = {
  receiverId: string;
  content: string;
};

type AssignmentInput = {
  courseId: number;
  title: string;
  description: string | null;
  dueDate: Date | null;
};

type SubmissionInput = {
  assignmentId: number;
  content: string;
};

const VALID_ROLES: Role[] = ["STUDENT", "TUTOR", "ADMIN"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalTrimmedString(value: unknown): string | null {
  const text = toTrimmedString(value);
  return text || null;
}

export function validateRegistrationPayload(raw: unknown): RegistrationInput {
  const body = asRecord(raw);
  const fullName = toTrimmedString(body.fullName);
  const email = toTrimmedString(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const roleValue = toTrimmedString(body.role).toUpperCase();

  if (!fullName) throw new ServiceError("Full name is required.", 400);
  if (fullName.length < 2) throw new ServiceError("Name must be at least 2 characters.", 400);
  if (!email) throw new ServiceError("Email is required.", 400);
  if (!EMAIL_REGEX.test(email)) throw new ServiceError("Please enter a valid email address.", 400);
  if (!password) throw new ServiceError("Password is required.", 400);
  if (password.length < 8) throw new ServiceError("Password must be at least 8 characters.", 400);
  if (!VALID_ROLES.includes(roleValue as Role)) {
    throw new ServiceError("Please select a valid role (STUDENT, TUTOR, or ADMIN).", 400);
  }

  return { fullName, email, password, role: roleValue as Role };
}

export function validateLoginPayload(raw: unknown): LoginInput {
  const body = asRecord(raw);
  const email = toTrimmedString(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  if (!email) throw new ServiceError("Email is required.", 400);
  if (!password) throw new ServiceError("Password is required.", 400);

  return { email, password };
}

export function validateCoursePayload(raw: unknown): CourseInput {
  const body = asRecord(raw);
  const title = toTrimmedString(body.title);
  const subject = toTrimmedString(body.subject);

  if (!title || !subject) {
    throw new ServiceError("title and subject are required", 400);
  }

  let price: number | null = null;
  if (body.price !== undefined && body.price !== null && body.price !== "") {
    price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new ServiceError("Price must be a non-negative number", 400);
    }
  }

  return {
    title,
    subject,
    description: toOptionalTrimmedString(body.description),
    price,
    level: toOptionalTrimmedString(body.level),
    isPublished: !!body.isPublished,
  };
}

export function validateStudyPlanTasks(rawTasks: unknown): StudyPlanTaskInput[] {
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    throw new ServiceError("At least one task is required", 400);
  }

  return rawTasks.map((rawTask, index) => {
    const task = asRecord(rawTask);
    const title = toTrimmedString(task.title);
    const dueDate = new Date(String(task.dueDate || ""));
    const courseId = Number(task.courseId);

    if (!title) throw new ServiceError(`Task ${index + 1}: title is required`, 400);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      throw new ServiceError(`Task ${index + 1}: course is required`, 400);
    }
    if (Number.isNaN(dueDate.getTime())) {
      throw new ServiceError(`Task ${index + 1}: due date is invalid`, 400);
    }

    return {
      title,
      dueDate,
      courseId,
      completed: !!task.completed,
    };
  });
}

export function validateStudyPlanCreatePayload(raw: unknown): StudyPlanCreateInput {
  const body = asRecord(raw);
  const sourcePlanId = Number(body.sourcePlanId || 0);

  return {
    sourcePlanId,
    tasks: sourcePlanId ? undefined : validateStudyPlanTasks(body.tasks),
  };
}

export function validateStudyPlanUpdatePayload(raw: unknown): StudyPlanUpdateInput {
  const body = asRecord(raw);
  const planId = Number(body.planId || 0);
  if (!planId) throw new ServiceError("planId is required", 400);

  return {
    planId,
    tasks: validateStudyPlanTasks(body.tasks),
  };
}

export function validateTaskStatusPayload(raw: unknown): TaskStatusInput {
  const body = asRecord(raw);
  if (typeof body.completed !== "boolean") {
    throw new ServiceError("Invalid completed value", 400);
  }

  return { completed: body.completed };
}

export function validateMessageSendPayload(raw: unknown): MessageSendInput {
  const body = asRecord(raw);
  const receiverId = toTrimmedString(body.receiverId);
  const content = toTrimmedString(body.content);

  if (!receiverId) throw new ServiceError("receiverId is required", 400);
  if (!content || content.length > 8000) {
    throw new ServiceError("content must be 1-8000 characters", 400);
  }

  return { receiverId, content };
}

export function validateAssignmentPayload(raw: unknown): AssignmentInput {
  const body = asRecord(raw);
  const courseId = Number(body.courseId || 0);
  const title = toTrimmedString(body.title);

  if (!courseId || !title) {
    throw new ServiceError("courseId and title are required", 400);
  }

  const dueDate = body.dueDate ? new Date(String(body.dueDate)) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    throw new ServiceError("dueDate is invalid", 400);
  }

  return {
    courseId,
    title,
    description: toOptionalTrimmedString(body.description),
    dueDate,
  };
}

export function validateSubmissionPayload(raw: unknown): SubmissionInput {
  const body = asRecord(raw);
  const assignmentId = Number(body.assignmentId || 0);
  const content = toTrimmedString(body.content);

  if (!assignmentId) throw new ServiceError("assignmentId is required", 400);
  if (!content) throw new ServiceError("Submission content cannot be empty", 400);

  return { assignmentId, content };
}
