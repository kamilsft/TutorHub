import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/service-error";
import { validateCoursePayload } from "@/lib/validation";

export async function listPublishedCourses(subject: string | null) {
  const where: { isPublished: true; subject?: string } = { isPublished: true };
  if (subject) where.subject = subject;

  return prisma.course.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      tutor: {
        select: { id: true, fullName: true, avatar: true },
      },
    },
  });
}

export async function createCourseForTutor(tutorId: string, input: unknown) {
  const course = validateCoursePayload(input);

  return prisma.course.create({
    data: {
      title: course.title,
      subject: course.subject,
      description: course.description,
      tutorId,
      price: course.price,
      level: course.level,
      isPublished: course.isPublished,
    },
  });
}
