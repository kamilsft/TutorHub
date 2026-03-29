import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import EnrolledCourseList, { Course }  from "@/components/EnrolledCourseList";

export default async function StudentCoursesPage() {
  try {
    const token = cookies().get("authToken")?.value;
    if (!token) return <p>Please log in</p>;

    const payload = verifyToken(token);
    if (!payload || payload.role !== "STUDENT") return <p>Forbidden</p>;

    const studentId = payload.sub;

     // fetch only courses where the student is enrolled (ACTIVE)
  const enrolledCourses: Course[] = await prisma.course.findMany({
    where: {
      enrollments: {
        some: { studentId, status: "ACTIVE" },
      },
      isPublished: true,
    },
    include: { tutor: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Courses</h1>
        <a
          href="/dashboard/student"
          className="text-sm text-emerald-600 hover:underline"
        >
          ← Back to dashboard
        </a>
      </div>
      <EnrolledCourseList courses={enrolledCourses} />
    </main>
  );

} catch (err) {
    console.error("Error verifying token:", err);
    return <p>Error verifying user</p>;
  }
}
