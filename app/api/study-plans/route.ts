import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireResourceOwner } from "@/lib/api-auth";

type TaskInput = {
  title: string;
  dueDate: string;
  courseId: string | number;
  completed?: boolean;
};

export async function GET(req: Request) {
  try {
    const auth = requireAuthenticatedUser(req);
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const scope = (url.searchParams.get("scope") || "mine").toLowerCase();
    const studentIdFilter = url.searchParams.get("studentId");

    if (auth.role === "STUDENT") {
      if (scope === "discover") {
        const plans = await prisma.studyPlan.findMany({
            where: { studentId: { not: auth.sub } },
            include: {
              tasks: { orderBy: { dueDate: "asc" } },
              student: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: "desc" },
          });
        return NextResponse.json(plans);
      }

      const plans = await prisma.studyPlan.findMany({
        where: { studentId: auth.sub },
        include: { tasks: { orderBy: { dueDate: "asc" } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(plans);
    }

    if (auth.role === "TUTOR") {
      const plans = await prisma.studyPlan.findMany({
        where: studentIdFilter ? { studentId: studentIdFilter } : undefined,
        include: {
          tasks: { orderBy: { dueDate: "asc" } },
          student: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(plans);
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (err) {
    console.error("GET /api/study-plans error:", err);
    return NextResponse.json({ error: "Failed to fetch study plans" }, { status: 500 });
  }
}

function parseTasks(rawTasks: unknown):
  | { tasks: Array<{ title: string; dueDate: Date; courseId: number; completed: boolean }> }
  | { error: string } {
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    return { error: "At least one task is required" };
  }

  const tasks: Array<{
    title: string;
    dueDate: Date;
    courseId: number;
    completed: boolean;
  }> = [];
  for (let i = 0; i < rawTasks.length; i += 1) {
    const task = rawTasks[i] as TaskInput;
    const title = (task?.title || "").toString().trim();
    const dueDate = new Date(task?.dueDate);
    const courseId = Number(task?.courseId);

    if (!title) return { error: `Task ${i + 1}: title is required` };
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return { error: `Task ${i + 1}: course is required` };
    }
    if (Number.isNaN(dueDate.getTime())) {
      return { error: `Task ${i + 1}: due date is invalid` };
    }

    tasks.push({
      title,
      dueDate,
      courseId,
      completed: !!task?.completed,
    });
  }

  return { tasks };
}

export async function POST(req: Request) {
  try {
    const auth = requireAuthenticatedUser(req);
    if (auth instanceof Response) return auth;
    if (auth.role !== "STUDENT" && auth.role !== "TUTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const sourcePlanId = Number(body.sourcePlanId || 0);

    const requestedStudentId =
      typeof body.studentId === "string" ? body.studentId : "";
    const targetStudentId = auth.role === "STUDENT" ? auth.sub : requestedStudentId;

    if (!targetStudentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const studentExists = await prisma.user.findUnique({
      where: { id: targetStudentId },
      select: { id: true },
    });
    if (!studentExists) {
      return NextResponse.json({ error: "Student not found" }, { status: 400 });
    }

    let taskPayload: Array<{ title: string; dueDate: Date; courseId: number; completed: boolean }> =
      [];

    if (sourcePlanId) {
      const sourcePlan = await prisma.studyPlan.findUnique({
        where: { id: sourcePlanId },
        include: { tasks: true },
      });
      if (!sourcePlan) {
        return NextResponse.json({ error: "Source plan not found" }, { status: 404 });
      }

      taskPayload = sourcePlan.tasks.map((task) => ({
        title: task.title,
        dueDate: task.dueDate,
        courseId: task.courseId,
        completed: !!task.completed,
      }));
    } else {
      const parsed = parseTasks(body.tasks);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      taskPayload = parsed.tasks;
    }

    const newPlan = await prisma.studyPlan.create({
      data: {
        studentId: targetStudentId,
        tasks: {
          create: taskPayload,
        },
      },
      include: { tasks: true },
    });

    return NextResponse.json(newPlan, { status: 201 });
  } catch (err) {
    console.error("POST /api/study-plans error:", err);
    return NextResponse.json({ error: "Failed to create study plan" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = requireAuthenticatedUser(req);
    if (auth instanceof Response) return auth;
    if (auth.role !== "STUDENT" && auth.role !== "TUTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const planId = Number(body.planId || 0);
    if (!planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    const parsed = parseTasks(body.tasks);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existingPlan = await prisma.studyPlan.findUnique({
      where: { id: planId },
      select: { id: true, studentId: true },
    });
    if (!existingPlan) {
      return NextResponse.json({ error: "Study plan not found" }, { status: 404 });
    }

    if (auth.role === "STUDENT") {
      const ownership = requireResourceOwner({
        ownerId: existingPlan.studentId,
        userId: auth.sub,
        errorMessage: "You do not own this plan",
      });
      if (ownership instanceof Response) return ownership;
    }

    const updated = await prisma.studyPlan.update({
      where: { id: planId },
      data: {
        tasks: {
          deleteMany: {},
          create: parsed.tasks,
        },
      },
      include: { tasks: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/study-plans error:", err);
    return NextResponse.json({ error: "Failed to update study plan" }, { status: 500 });
  }
}
