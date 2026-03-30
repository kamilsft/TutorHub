// This API route handles DELETE requests to delete a study plan by its ID.
// Only the student who owns the plan can delete it.
// It first deletes all tasks associated with the plan, then deletes the plan itself.
// FR13 (update study plan)

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import * as planRepo from "@/lib/repositories/studyPlanRepository";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const planId = Number(params.id);
    if (isNaN(planId)) {
      return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
    }

    const plan = await planRepo.findPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: "Study plan not found" }, { status: 404 });
    }

    // 🔒 Only owner can delete
    if (auth.role !== "STUDENT" || plan.studentId !== auth.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ⚠️ IMPORTANT: delete tasks first (because of relations)
    await prisma.task.deleteMany({
      where: { studyPlanId: planId },
    });

    await prisma.studyPlan.delete({
      where: { id: planId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE study plan error:", err);
    return NextResponse.json({ error: "Failed to delete study plan" }, { status: 500 });
  }
}