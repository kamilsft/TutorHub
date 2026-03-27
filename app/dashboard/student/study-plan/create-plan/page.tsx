import Link from "next/link";
import StudyPlanForm from "@/components/StudyPlanForm";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams?: {
    copyFrom?: string;
  };
};

export default async function CreateStudyPlanPage({ searchParams }: Props) {
  try {
    const token = cookies().get("authToken")?.value;
    if (!token) return <p>Please log in</p>;

    const payload = verifyToken(token);
    if (!payload || payload.role !== "STUDENT") return <p>Forbidden</p>;

    const studentId = payload.sub;
    const copyFrom = Number(searchParams?.copyFrom || 0);

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: "ACTIVE" },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { enrolledAt: "desc" },
    });

    const availableCourseMap = new Map<string, string>();
    for (const enrollment of enrollments) {
      availableCourseMap.set(String(enrollment.course.id), enrollment.course.title);
    }

    let copiedFromStudentName: string | null = null;
    let copiedTasks:
      | Array<{
          title: string;
          courseId: number;
          dueDate: Date;
          completed: boolean;
        }>
      | undefined;

    if (copyFrom) {
      const sourcePlan = await prisma.studyPlan.findUnique({
        where: { id: copyFrom },
        include: {
          student: { select: { fullName: true } },
          tasks: {
            include: {
              course: { select: { id: true, title: true } },
            },
          },
        },
      });

      if (sourcePlan) {
        copiedFromStudentName = sourcePlan.student?.fullName || "another student";
        copiedTasks = sourcePlan.tasks.map((task) => ({
          title: task.title,
          courseId: task.courseId,
          dueDate: task.dueDate,
          completed: !!task.completed,
        }));
        for (const task of sourcePlan.tasks) {
          availableCourseMap.set(String(task.course.id), task.course.title);
        }
      }
    }

    const availableCourses = Array.from(availableCourseMap.entries()).map(([id, title]) => ({
      id,
      title,
    }));

    return (
      <main className="p-8">
        {/* Header + Back link */}
        <div className="container mx-auto px-4 mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            {copiedTasks ? "Copy Study Plan" : "Create Study Plan"}
          </h1>
          <Link
            href="/dashboard/student"
            className="text-sm text-emerald-600 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>

        {/* Form */}
        <div className="container mx-auto px-4 max-w-3xl space-y-4">
          {copiedTasks && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Editing a copy of {copiedFromStudentName}&apos;s plan. Save to add it to your plans.
            </p>
          )}
          <StudyPlanForm
            initialTasks={copiedTasks}
            availableCourses={availableCourses}
            onSavedPath="/dashboard/student/study-plan/view-plans"
            saveButtonLabel={copiedTasks ? "Save copied plan" : "Save plan"}
          />
        </div>
      </main>
    );
  } catch (err) {
    console.error("Error verifying token:", err);
    return <p>Error verifying user</p>;
  }
}
