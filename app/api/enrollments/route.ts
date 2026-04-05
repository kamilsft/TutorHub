// app/api/enrollments/route.ts
// FR6 (enroll in course), NFR1 (auth), NFR2 (student-only)
// Route handles request/response only — business logic lives in enrollmentService

import { NextResponse } from "next/server";
import { requireStudent, isAuthError } from "@/lib/api-auth";
import * as enrollmentService from "@/lib/services/enrollmentService";

// FR6 + NFR1 + NFR2 - student enrols in a published course
// studentId always comes from the JWT, never from the body
export async function POST(request: Request) {
  try {
    // NFR1 + NFR2 - must be logged in as a STUDENT
    const auth = requireStudent(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json().catch(() => ({}));
    const { enrollment, alreadyEnrolled } = await enrollmentService.enrollStudent(auth.sub, body);

    if (alreadyEnrolled) {
      return NextResponse.json({ error: "Already enrolled", enrollment }, { status: 200 });
    }

    return NextResponse.json({ success: true, enrollment }, { status: 201 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("POST /api/enrollments error", err);
    return NextResponse.json({ error: "Failed to enroll" }, { status: 500 });
  }
}
