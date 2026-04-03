// app/api/study-plans/route.ts
// Handles creating, viewing, and updating student study plans
// FR12 (create), FR13 (view/update), NFR1 (auth), NFR2 (ownership)

import { NextResponse } from "next/server";
import { requireAuth, requireStudent, isAuthError } from "@/lib/api-auth";
import * as studyPlanService from "@/lib/services/studyPlanService";

// FR13 + NFR1 + NFR2 - return the logged-in student's own study plans
// studentId query param is ignored — identity always comes from the JWT
export async function GET(req: Request) {
  try {
    // NFR1 - must be logged in as a STUDENT
    const auth = requireStudent(req);
    if (isAuthError(auth)) return auth;

    // NFR2 - auth.sub is the verified student ID, not something the client can fake
    const plans = await studyPlanService.getStudentPlans(auth.sub);
    return NextResponse.json(plans);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("GET /api/study-plans error", err);
    return NextResponse.json({ error: "Failed to fetch study plans" }, { status: 500 });
  }
}

// FR12 + NFR1 + NFR2 + NFR4 - create a study plan for the logged-in student
// studentId in the body is ignored — we always use auth.sub from the token
export async function POST(req: Request) {
  try {
    // NFR1 - must be logged in as a STUDENT to create a plan
    const auth = requireStudent(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json().catch(() => ({}));

    // NFR2 - always creates the plan for the logged-in student, not whoever the client says
    const plan = await studyPlanService.createPlan(auth.sub, body);
    return NextResponse.json(plan);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("POST /api/study-plans error", err);
    return NextResponse.json({ error: "Failed to create study plan" }, { status: 500 });
  }
}

// FR13 + NFR1 + NFR2 + NFR4 - update a study plan
// Students can only update their own plan.
// Tutors can only update a plan if the student is enrolled in at least one of the tutor's courses —
// this prevents arbitrary tutors from editing any student's plan (NFR2 shared-course rule).
export async function PUT(req: Request) {
  try {
    // NFR1 - must be logged in
    const auth = requireAuth(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json().catch(() => ({}));
    const planId = Number(body.planId);
    if (!planId) return NextResponse.json({ error: "planId is required" }, { status: 400 });

    // NFR2 - studyPlanService enforces:
    //   • students can only edit their own plan
    //   • tutors can edit only if the student is enrolled in one of their courses
    const plan = await studyPlanService.updatePlan(planId, auth.sub, auth.role, body);
    return NextResponse.json(plan);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("PUT /api/study-plans error", err);
    return NextResponse.json({ error: "Failed to update study plan" }, { status: 500 });
  }
}
