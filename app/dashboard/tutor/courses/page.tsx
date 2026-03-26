import CreateCourseForm from "@/components/CreateCourseForm";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import Link from "next/link";

export default async function TutorCoursesPage() {
  const hdrs = headers();
  const userId = hdrs.get("x-user-id") || "";
  const role = hdrs.get("x-user-role") || "";

  if (!userId || role !== "TUTOR") {
    return (
      <main className="py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-semibold text-slate-900">My courses</h1>
          <p className="mt-2 text-sm text-slate-600">Only tutors can access this page.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const courses = await prisma.course.findMany({
    where: { tutorId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      isPublished: true,
      updatedAt: true,
      _count: {
        select: {
          enrollments: true,
          assignments: true,
        },
      },
    },
  });

  return (
    <main className="py-8">
      <div className="container mx-auto px-4 space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">My courses</h1>
              <p className="mt-1 text-sm text-slate-600">
                Draft courses stay visible to you here, but hidden from students and other tutors.
              </p>
            </div>
            <Link href="/dashboard/tutor" className="text-sm text-emerald-600 hover:underline">
              ← Back to dashboard
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {courses.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                No courses yet. Create your first course below.
              </p>
            ) : (
              courses.map((course) => (
                <article
                  key={course.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">{course.title}</h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          course.isPublished
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {course.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {course.subject} • {course._count.enrollments} enrollments •{" "}
                      {course._count.assignments} assignments
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Updated {new Date(course.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/tutor/courses/${course.id}/edit`}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/courses/${course.id}`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create a new course</h2>
          <CreateCourseForm tutorId={userId} />
        </section>
      </div>
    </main>
  );
}
