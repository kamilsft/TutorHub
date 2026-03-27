import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireTutorRole } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");
    const where: any = { isPublished: true };

    if (subject) {
      where.subject = subject;
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        tutor: {
          select: { id: true, fullName: true, avatar: true },
        },
      },
    });

    return NextResponse.json(courses);
  } catch (err) {
    console.error("GET /api/courses error", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const tutor = requireTutorRole(auth, "Only tutors can create courses");
    if (tutor instanceof Response) return tutor;

    const body = await request.json().catch(() => ({}));
    const title = (body.title || "").toString().trim();
    const subject = (body.subject || "").toString().trim();
    if (!title || !subject) {
      return NextResponse.json({ error: "title and subject are required" }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        title,
        subject,
        description: body.description || null,
        tutorId: tutor.sub,
        price: typeof body.price === "number" ? body.price : body.price ? parseFloat(body.price) : null,
        level: body.level || null,
        isPublished: !!body.isPublished,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    console.error("POST /api/courses error", err);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
