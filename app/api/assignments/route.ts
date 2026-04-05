// app/api/assignments/route.ts
// FR7 (create/list), NFR1, NFR2, NFR4
// Route handles request/response only — business logic lives in assignmentService

import { NextResponse } from "next/server";
import { requireAuth, requireTutor, isAuthError } from "@/lib/api-auth";
import * as assignmentService from "@/lib/services/assignmentService";

// FR7 + NFR1 + NFR2 - list assignments for a course
export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const courseId = Number(searchParams.get("courseId") || 0);
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

    const assignments = await assignmentService.listAssignments(courseId, auth.sub, auth.role);
    return NextResponse.json(assignments);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("GET /api/assignments error:", err);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

// FR7 + NFR1 + NFR2 + NFR4 - tutor creates an assignment
export async function POST(request: Request) {
  try {
    // NFR2 - only tutors can create assignments
    const auth = requireTutor(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json().catch(() => ({}));
    const assignment = await assignmentService.createAssignment(auth.sub, body);
    return NextResponse.json(assignment, { status: 201 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("POST /api/assignments error:", err);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
