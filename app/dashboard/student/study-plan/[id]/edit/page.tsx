import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import StudyPlanForm from "@/components/StudyPlanForm";

type Props = {
  params: { id: string };
};

export default async function StudentEditStudyPlanPage({ params }: Props) {
  try {
    const planId = Number(params.id);
    if (Number.isNaN(planId)) return <p>Invalid plan id.</p>;

    const token = cookies().get("authToken")?.value;
    if (!token) return <p>Please log in</p>;

    const payload = verifyToken(token);
    if (!payload || payload.role !== "STUDENT") return <p>Forbidden</p>;

    const studentId = payload.sub;

    const plan = await prisma.studyPlan.findFirst({
      where: { id: planId, studentId },
      include: {
        tasks: {
          include: { course: { select: { id: true, title: true } } },
          orderBy: { dueDate: "asc" },
        },
      },
    });
    if (!plan) return <p>Study plan not found.</p>;

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: "ACTIVE" },
      include: { course: { select: { id: true, title: true } } },
    });

    const availableCourseMap = new Map<string, string>();
    for (const enrollment of enrollments) {
      availableCourseMap.set(String(enrollment.course.id), enrollment.course.title);
    }
    for (const task of plan.tasks) {
      availableCourseMap.set(String(task.course.id), task.course.title);
    }

    const availableCourses = Array.from(availableCourseMap.entries()).map(([id, title]) => ({
      id,
      title,
    }));

    return (
      <main className="p-8">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Edit Study Plan</h1>
            <Link
              href="/dashboard/student/study-plan/view-plans"
              className="text-sm text-emerald-600 hover:underline"
            >
              ← Back to plans
            </Link>
          </div>

          <StudyPlanForm
            planId={plan.id}
            initialTasks={plan.tasks}
            availableCourses={availableCourses}
            onSavedPath="/dashboard/student/study-plan/view-plans"
            saveButtonLabel="Update plan"
          />
        </div>
      </main>
    );
  } catch (err) {
    console.error("Error loading study plan edit page:", err);
    return <p>Error loading study plan.</p>;
  }
}
