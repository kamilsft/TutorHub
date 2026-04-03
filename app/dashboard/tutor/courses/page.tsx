import CreateCourseForm from "@/components/CreateCourseForm";
import TutorCourseList from "@/components/TutorCourseList";
import { headers } from "next/headers";
import Link from "next/link";

export default function TutorCoursesPage() {
  const hdrs = headers();
  const userId = hdrs.get("x-user-id") || "";
  const role = hdrs.get("x-user-role") || "";

  if (!userId || role !== "TUTOR") {
    return (
      <main className="py-8">
        <div className="container mx-auto px-4">
          <p className="text-sm text-slate-700">Only tutors can access this page.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Course management
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          My Courses
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          View, edit, and manage your course offerings. Archive courses you no longer teach.
        </p>
      </div>

      {/* Course list */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Your courses</h2>
        <TutorCourseList />
      </section>

      {/* Create form */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Create a new course</h2>
        <CreateCourseForm tutorId={userId} />
      </section>

      {/* Back link */}
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 p-6 text-center">
        <p className="text-sm text-slate-600">
          <Link
            href="/dashboard/tutor"
            className="font-semibold text-emerald-700 hover:text-emerald-600 hover:underline"
          >
            &larr; Back to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
