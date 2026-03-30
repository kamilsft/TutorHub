import Link from "next/link";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma"; // assuming you use Prisma
import StudyPlanCard from "@/components/StudyPlanCard";
import DeleteStudyPlanButton from "@/components/DeleteStudyPlan";

export default async function ViewStudyPlansPage() {
  try {
    const token = cookies().get("authToken")?.value;
    if (!token) return <p>Please log in</p>;

    const payload = verifyToken(token);
    if (!payload || payload.role !== "STUDENT") return <p>Forbidden</p>;

    const studentId = payload.sub;

    // Fetch the logged-in student's info
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });

    // Fetch saved study plans
    const studyPlans = await prisma.studyPlan.findMany({
      where: { studentId },
      include: { tasks: true },
      orderBy: { createdAt: "desc" },
    });

    if (studyPlans.length === 0) return <p>No study plans found.</p>;

    return (
      <main className="p-8">
        {/* Header + Back link */}
        <div className="container mx-auto px-4 mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Study Plans</h1>
          <Link
            href="/dashboard/student"
            className="text-sm text-emerald-600 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>


        {/* Study Plans */}
        {studyPlans.length === 0 ? (
          <p>No study plans found.</p>
        ) : (
            <div className="container mx-auto px-4 space-y-6">
            {studyPlans.map((plan) => (
              
              // <div key={plan.id} className="relative">
              <div key={plan.id} className="border rounded p-4 shadow-sm">

                {/* Study Plan Card (with checkbox + progress) */}
                <StudyPlanCard
                  planId={plan.id}
                  studentName={student?.fullName || "Student"}
                  createdAt={plan.createdAt.toISOString()}
                  tasks={plan.tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    courseId: String(t.courseId),
                    dueDate: t.dueDate.toISOString(),
                    completed: t.completed,
                  })
                )}
                showActions={true}
                />

      

                {/* Delete Button */}
              {/* <DeleteStudyPlanButton planId={plan.id} /> */}
                  </div>
            ))}
          </div>
        )}
      </main>
    );
  } catch (err) {
    console.error(err);
    return <p>Error fetching study plans</p>;
  }
}