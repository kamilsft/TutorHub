import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuthenticatedUser,
  requireResourceOwner,
  requireTutorRole,
} from "@/lib/api-auth";

// PATCH /api/courses/[id]
// updates a course owned by the logged-in tutor
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const tutor = requireTutorRole(auth, "Only tutors can update courses");
    if (tutor instanceof Response) return tutor;

    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
    }

    const existing = await prisma.course.findUnique({
      where: { id },
      select: { tutorId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const ownership = requireResourceOwner({
      ownerId: existing.tutorId,
      userId: tutor.sub,
      errorMessage: "You do not own this course",
    });
    if (ownership instanceof Response) return ownership;

    const body = await request.json().catch(() => ({}));
    const data: {
      title?: string;
      subject?: string;
      description?: string | null;
      price?: number | null;
      level?: string | null;
      isPublished?: boolean;
    } = {};

    if ("title" in body) {
      const title = (body.title || "").toString().trim();
      if (!title) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      data.title = title;
    }

    if ("subject" in body) {
      const subject = (body.subject || "").toString().trim();
      if (!subject) {
        return NextResponse.json({ error: "Subject cannot be empty" }, { status: 400 });
      }
      data.subject = subject;
    }

    if ("description" in body) {
      const description = (body.description || "").toString().trim();
      data.description = description || null;
    }

    if ("level" in body) {
      const level = (body.level || "").toString().trim();
      data.level = level || null;
    }

    if ("price" in body) {
      if (body.price === null || body.price === "") {
        data.price = null;
      } else {
        const price = Number(body.price);
        if (!Number.isFinite(price) || price < 0) {
          return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 });
        }
        data.price = price;
      }
    }

    if ("isPublished" in body) {
      if (typeof body.isPublished !== "boolean") {
        return NextResponse.json({ error: "isPublished must be true or false" }, { status: 400 });
      }
      data.isPublished = body.isPublished;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields were provided" }, { status: 400 });
    }

    const course = await prisma.course.update({
      where: { id },
      data,
    });

    return NextResponse.json(course);
  } catch (err) {
    console.error("PATCH /api/courses/[id] error:", err);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}
