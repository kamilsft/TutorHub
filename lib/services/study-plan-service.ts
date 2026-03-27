import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/service-error";

type TaskInput = {
  title?: unknown;
  dueDate?: unknown;
  courseId?: unknown;
  completed?: unknown;
};

type StudyPlanInput = {
  sourcePlanId?: unknown;
  planId?: unknown;
  tasks?: unknown;
};

function parseTasks(rawTasks: unknown) {
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    throw new ServiceError("At least one task is required", 400);
  }

  return rawTasks.map((rawTask, index) => {
    const task = rawTask as TaskInput;
    const title = (task?.title || "").toString().trim();
    const dueDate = new Date(String(task?.dueDate || ""));
    const courseId = Number(task?.courseId);

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
      completed: !!task?.completed,
    };
  });
}

export async function listStudyPlansForUser(userId: string) {
  return prisma.studyPlan.findMany({
    where: { studentId: userId },
    include: { tasks: { orderBy: { dueDate: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStudyPlanForUser(userId: string, input: StudyPlanInput) {
  const studentExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!studentExists) {
    throw new ServiceError("Student not found", 400);
  }

  const sourcePlanId = Number(input.sourcePlanId || 0);
  let taskPayload: Array<{ title: string; dueDate: Date; courseId: number; completed: boolean }> = [];

  if (sourcePlanId) {
    const sourcePlan = await prisma.studyPlan.findUnique({
      where: { id: sourcePlanId },
      include: { tasks: true },
    });

    if (!sourcePlan) {
      throw new ServiceError("Source plan not found", 404);
    }

    taskPayload = sourcePlan.tasks.map((task: typeof sourcePlan.tasks[number]) => ({
      title: task.title,
      dueDate: task.dueDate,
      courseId: task.courseId,
      completed: !!task.completed,
    }));
  } else {
    taskPayload = parseTasks(input.tasks);
  }

  return prisma.studyPlan.create({
    data: {
      studentId: userId,
      tasks: {
        create: taskPayload,
      },
    },
    include: { tasks: true },
  });
}

export async function updateOwnedStudyPlan(userId: string, input: StudyPlanInput) {
  const planId = Number(input.planId || 0);
  if (!planId) {
    throw new ServiceError("planId is required", 400);
  }

  const existingPlan = await prisma.studyPlan.findUnique({
    where: { id: planId },
    select: { id: true, studentId: true },
  });

  if (!existingPlan) {
    throw new ServiceError("Study plan not found", 404);
  }

  if (existingPlan.studentId !== userId) {
    throw new ServiceError("You do not own this plan", 403);
  }

  const tasks = parseTasks(input.tasks);

  return prisma.studyPlan.update({
    where: { id: planId },
    data: {
      tasks: {
        deleteMany: {},
        create: tasks,
      },
    },
    include: { tasks: true },
  });
}
