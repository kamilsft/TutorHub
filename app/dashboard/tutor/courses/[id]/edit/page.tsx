import EditCourseForm from "@/components/EditCourseForm";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import Link from "next/link";

type Props = {
  params: { id: string };
};

export default async function EditTutorCoursePage({ params }: Props) {
  const courseId = Number(params.id);
  if (Number.isNaN(courseId)) {
    return <div className="p-6">Invalid course id.</div>;
  }

  const hdrs = headers();
  const userId = hdrs.get("x-user-id") || "";
  const role = hdrs.get("x-user-role") || "";

  if (!userId || role !== "TUTOR") {
    return (
      <main className="py-8">
        <div className="container mx-auto px-4">
          <p className="text-sm text-slate-700">Only tutors can edit courses.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, tutorId: userId },
    select: {
      id: true,
      title: true,
      subject: true,
      description: true,
      price: true,
      level: true,
      isPublished: true,
    },
  });

  if (!course) {
    return (
      <main className="py-8">
        <div className="container mx-auto px-4">
          <p className="text-sm text-slate-700">
            Course not found or you do not have permission to edit it.
          </p>
          <Link
            href="/dashboard/tutor/courses"
            className="mt-4 inline-block text-sm text-emerald-600 hover:underline"
          >
            ← Back to my courses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Edit course</h1>
            <p className="mt-1 text-sm text-slate-600">
              Update course details and control student visibility.
            </p>
          </div>
          <Link href="/dashboard/tutor/courses" className="text-sm text-emerald-600 hover:underline">
            ← Back to my courses
          </Link>
        </div>

        <EditCourseForm course={course} />
      </div>
    </main>
  );
}
