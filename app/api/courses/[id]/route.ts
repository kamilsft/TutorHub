import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

function getToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);

  const cookie = request.headers.get("cookie") || "";
  const match = /authToken=([^;]+)/.exec(cookie);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

// PATCH /api/courses/[id]
// updates a course owned by the logged-in tutor
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    if (payload.role !== "TUTOR") {
      return NextResponse.json({ error: "Only tutors can update courses" }, { status: 403 });
    }

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
    if (existing.tutorId !== payload.sub) {
      return NextResponse.json({ error: "You do not own this course" }, { status: 403 });
    }

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
