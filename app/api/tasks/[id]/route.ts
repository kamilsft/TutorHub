import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireResourceOwner } from "@/lib/api-auth";
import { isServiceError } from "@/lib/services/service-error";
import { validateTaskStatusPayload } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuthenticatedUser(req);
    if (auth instanceof Response) return auth;

    const { completed } = validateTaskStatusPayload(await req.json().catch(() => ({})));
    const taskId = Number(params.id);

    if (Number.isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { studyPlan: { select: { studentId: true } } },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const ownership = requireResourceOwner({
      ownerId: task.studyPlan.studentId,
      userId: auth.sub,
      errorMessage: "You do not own this task",
    });
    if (ownership instanceof Response) return ownership;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { completed },
    });

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (err) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PATCH /api/tasks/[id] error:", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
