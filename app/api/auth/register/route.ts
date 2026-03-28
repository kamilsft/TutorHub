import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { isServiceError } from "@/lib/services/service-error";
import { validateRegistrationPayload } from "@/lib/validation";

const SALT_ROUNDS = 10;

// We validate input, hash the password, and create the user in the DB.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, password, role } = validateRegistrationPayload(body);

    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err: unknown) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Register error:", err);
    const message =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code === "P1010"
          ? "Database access denied. Check .env: use postgresql://USER:PASSWORD@localhost:5432/tutorhub and ensure the database exists and the user has access."
          : (err as { code: string }).code === "ECONNREFUSED"
            ? "Cannot reach the database. Is PostgreSQL running? Check DATABASE_URL in .env."
            : undefined
        : undefined;
    return NextResponse.json(
      { error: message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
