import Link from "next/link";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function progressPercent(tasks: Array<{ completed: boolean }>) {
  if (tasks.length === 0) return 0;
  const completedCount = tasks.filter((task) => task.completed).length;
  return Math.round((completedCount / tasks.length) * 100);
}

export default async function ViewStudyPlansPage() {
  try {
    const token = cookies().get("authToken")?.value;
    if (!token) return <p>Please log in</p>;

    const payload = verifyToken(token);
    if (!payload || payload.role !== "STUDENT") return <p>Forbidden</p>;

    const studentId = payload.sub;
    const studyPlans = await prisma.studyPlan.findMany({
      where: { studentId },
      include: {
        tasks: {
          include: {
            course: { select: { id: true, title: true } },
          },
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const communityPlans = await prisma.studyPlan.findMany({
      where: { studentId: { not: studentId } },
      include: {
        student: { select: { fullName: true } },
        tasks: {
          include: {
            course: { select: { id: true, title: true } },
          },
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    return (
      <main className="p-8">
        {/* Header + Back link */}
        <div className="container mx-auto px-4 mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Study Plans</h1>
          <Link
            href="/dashboard/student"
            className="inline-flex items-center rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            &larr; Back to dashboard
          </Link>
        </div>

        <div className="container mx-auto px-4 space-y-10">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Your plans</h2>
              <Link
                href="/dashboard/student/study-plan/create-plan"
                className="text-sm text-emerald-700 hover:underline"
              >
                + Create new plan
              </Link>
            </div>

            {studyPlans.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                No study plans yet. Create one to start tracking tasks and progress.
              </p>
            ) : (
              <div className="space-y-4">
                {studyPlans.map((plan) => (
                  <article
                    key={plan.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          Plan from {new Date(plan.createdAt).toLocaleDateString()}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {progressPercent(plan.tasks)}% complete
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/student/study-plan/${plan.id}/edit`}
                          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                        >
                          Edit plan
                        </Link>
                        <Link
                          href={`/dashboard/student/study-plan/create-plan?copyFrom=${plan.id}`}
                          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Duplicate
                        </Link>
                      </div>
                    </div>

                    <ul className="space-y-1 text-sm text-slate-700">
                      {plan.tasks.map((task) => (
                        <li key={task.id}>
                          <span className={task.completed ? "line-through text-slate-400" : ""}>
                            {task.title}
                          </span>{" "}
                          - {task.course?.title || `Course #${task.courseId}`} - due{" "}
                          {new Date(task.dueDate).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Community plans you can copy
            </h2>
            {communityPlans.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                No public plans available right now.
              </p>
            ) : (
              <div className="space-y-4">
                {communityPlans.map((plan) => (
                  <article
                    key={plan.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {plan.student?.fullName || "Student"}&apos;s plan
                        </h3>
                        <p className="text-sm text-slate-600">
                          Created {new Date(plan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/student/study-plan/create-plan?copyFrom=${plan.id}`}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                      >
                        Copy and edit
                      </Link>
                    </div>

                    <ul className="space-y-1 text-sm text-slate-700">
                      {plan.tasks.slice(0, 5).map((task) => (
                        <li key={task.id}>
                          {task.title} - {task.course?.title || `Course #${task.courseId}`} - due{" "}
                          {new Date(task.dueDate).toLocaleDateString()}
                        </li>
                      ))}
                      {plan.tasks.length > 5 && (
                        <li className="text-slate-500">+ {plan.tasks.length - 5} more tasks</li>
                      )}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  } catch (err) {
    console.error(err);
    return <p>Error fetching study plans</p>;
  }
}
