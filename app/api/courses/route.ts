// app/api/courses/route.ts
// FR4 (browse), FR5 (create/update/archive), NFR1, NFR2, NFR4

import { NextResponse } from "next/server";
import { requireTutor, isAuthError } from "@/lib/api-auth";
import * as courseService from "@/lib/services/courseService";

// FR4 - any visitor can browse published courses
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject") ?? undefined;
    const courses = await courseService.listPublishedCourses(subject);
    return NextResponse.json(courses);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("GET /api/courses error", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

// FR5 + NFR1 + NFR2 - only authenticated tutors can create courses
// tutorId comes from the JWT — body tutorId is always ignored
export async function POST(request: Request) {
  try {
    const auth = requireTutor(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json().catch(() => ({}));
    const course = await courseService.createCourse(auth.sub, body);
    return NextResponse.json(course, { status: 201 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("POST /api/courses error", err);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}

// FR5 + NFR2 - tutor updates their own course
export async function PATCH(request: Request) {
  try {
    const auth = requireTutor(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Course id is required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const course = await courseService.updateCourse(id, auth.sub, body);
    return NextResponse.json(course);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("PATCH /api/courses error", err);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

// FR5 + NFR2 - archive (unpublish) a course instead of hard-deleting
// preserves all enrollments, assignments and submissions
export async function DELETE(request: Request) {
  try {
    const auth = requireTutor(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Course id is required" }, { status: 400 });

    const course = await courseService.archiveCourse(id, auth.sub);
    return NextResponse.json({ success: true, course });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("DELETE /api/courses error", err);
    return NextResponse.json({ error: "Failed to archive course" }, { status: 500 });
  }
}
