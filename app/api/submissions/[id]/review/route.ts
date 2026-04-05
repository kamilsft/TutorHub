// app/api/submissions/[id]/review/route.ts
// FR9 (review/grade), NFR1, NFR2, NFR4
// Route handles request/response only — business logic lives in submissionService

import { NextResponse } from "next/server";
import { requireTutor, isAuthError } from "@/lib/api-auth";
import * as submissionService from "@/lib/services/submissionService";

// FR9 + NFR1 + NFR2 + NFR4 - tutor grades a submission they own
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    // NFR2 - only tutors can review
    const auth = requireTutor(request);
    if (isAuthError(auth)) return auth;

    const submissionId = Number(params.id);
    if (isNaN(submissionId)) {
      return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const updated = await submissionService.reviewSubmission(submissionId, auth.sub, body);
    return NextResponse.json({ success: true, submission: updated });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("PATCH /api/submissions/[id]/review error:", err);
    return NextResponse.json({ error: "Failed to review submission" }, { status: 500 });
  }
}
