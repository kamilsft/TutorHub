import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import CourseEnrollClient from "@/components/CourseEnrollClient";
import { verifyToken } from "@/lib/jwt";

type Props = { params: { id: string } };

export default async function CoursePage({ params }: Props) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return <div className="p-6">Invalid course id</div>;

  const hdrs = headers();
  const authHeader = hdrs.get("authorization") || "";
  let token: string | null = null;
  if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
  else {
    const cookie = hdrs.get("cookie") || "";
    const m = /authToken=([^;]+)/.exec(cookie);
    if (m) token = decodeURIComponent(m[1]);
  }

  const viewer = token ? verifyToken(token) : null;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      tutor: { select: { id: true, fullName: true, avatar: true } },
      enrollments: true,
    },
  });

  if (!course) return <div className="p-6">Course not found.</div>;

  const canViewUnpublished =
    viewer?.role === "TUTOR" && viewer.sub === course.tutorId;
  if (!course.isPublished && !canViewUnpublished) {
    return <div className="p-6">Course not found.</div>;
  }

  const enrolledCount = course.enrollments?.length ?? 0;

  // detect current user (if any) and whether they are enrolled
  let initiallyJoined = false;
  try {
    if (viewer?.role === "STUDENT") {
      const studentId = viewer.sub;
      const existing = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId: id } as any },
      });
      if (existing && existing.status === "ACTIVE") initiallyJoined = true;
    }
  } catch (e) {
    // ignore - treat as unauthenticated
  }

  return (
    <main className="py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h1 className="text-2xl font-semibold mb-2">{course.title}</h1>
          <div className="text-sm text-gray-600 mb-4">
            {course.subject} • {course.level ?? "Any level"} • {course.tutor?.fullName ?? "Unknown tutor"}
          </div>
          <p className="text-gray-700 mb-4">{course.description ?? "No description provided."}</p>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {typeof course.price === "number" ? `$${course.price.toFixed(2)}` : "Free"}
              {course.capacity ? ` • ${enrolledCount}/${course.capacity} enrolled` : ""}
            </div>

            <CourseEnrollClient
              courseId={course.id}
              isPublished={!!course.isPublished}
              capacity={course.capacity ?? null}
              enrolledCount={enrolledCount}
              initiallyJoined={initiallyJoined}
            />
          </div>

          <div className="mt-4">
            <Link href="/courses" className="text-sm text-emerald-600 hover:underline">
              ← Back to courses
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
