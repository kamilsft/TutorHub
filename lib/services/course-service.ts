import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/service-error";

type CourseInput = {
  title?: unknown;
  subject?: unknown;
  description?: unknown;
  price?: unknown;
  level?: unknown;
  isPublished?: unknown;
};

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

export async function createCourseForTutor(tutorId: string, input: CourseInput) {
  const title = (input.title || "").toString().trim();
  const subject = (input.subject || "").toString().trim();

  if (!title || !subject) {
    throw new ServiceError("title and subject are required", 400);
  }

  return prisma.course.create({
    data: {
      title,
      subject,
      description: input.description ? String(input.description).trim() || null : null,
      tutorId,
      price: typeof input.price === "number" ? input.price : input.price ? parseFloat(String(input.price)) : null,
      level: input.level ? String(input.level).trim() || null : null,
      isPublished: !!input.isPublished,
    },
  });
}
