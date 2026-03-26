import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

function getToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  const cookie = request.headers.get("cookie") || "";
  const match = /authToken=([^;]+)/.exec(cookie);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    if (payload.role !== "STUDENT" && payload.role !== "TUTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { completed } = await req.json().catch(() => ({}));
    const taskId = Number(params.id);

    if (Number.isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }
    if (typeof completed !== "boolean") {
      return NextResponse.json({ error: "Invalid completed value" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { studyPlan: { select: { studentId: true } } },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (payload.role === "STUDENT" && task.studyPlan.studentId !== payload.sub) {
      return NextResponse.json({ error: "You do not own this task" }, { status: 403 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { completed },
    });

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/tasks/[id] error:", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
