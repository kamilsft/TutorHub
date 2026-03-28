import { NextResponse } from "next/server";
import { requireAuthenticatedUser, requireTutorRole } from "@/lib/api-auth";
import { createCourseForTutor, listPublishedCourses } from "@/lib/services/course-service";
import { isServiceError } from "@/lib/services/service-error";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");
    const courses = await listPublishedCourses(subject);
    return NextResponse.json(courses);
  } catch (err) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/courses error", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const tutor = requireTutorRole(auth, "Only tutors can create courses");
    if (tutor instanceof Response) return tutor;

    const body = await request.json().catch(() => ({}));
    const course = await createCourseForTutor(tutor.sub, body);

    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/courses error", err);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
