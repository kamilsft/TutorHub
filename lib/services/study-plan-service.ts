import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/service-error";
import {
  validateStudyPlanCreatePayload,
  validateStudyPlanUpdatePayload,
} from "@/lib/validation";

export async function listStudyPlansForUser(userId: string) {
  return prisma.studyPlan.findMany({
    where: { studentId: userId },
    include: { tasks: { orderBy: { dueDate: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStudyPlanForUser(userId: string, input: unknown) {
  const studentExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!studentExists) {
    throw new ServiceError("Student not found", 400);
  }

  const parsed = validateStudyPlanCreatePayload(input);
  const sourcePlanId = parsed.sourcePlanId;
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
    taskPayload = parsed.tasks || [];
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

export async function updateOwnedStudyPlan(userId: string, input: unknown) {
  const parsed = validateStudyPlanUpdatePayload(input);
  const planId = parsed.planId;

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

  return prisma.studyPlan.update({
    where: { id: planId },
    data: {
      tasks: {
        deleteMany: {},
        create: parsed.tasks,
      },
    },
    include: { tasks: true },
  });
}
