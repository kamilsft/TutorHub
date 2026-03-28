import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import {
  createStudyPlanForUser,
  listStudyPlansForUser,
  updateOwnedStudyPlan,
} from "@/lib/services/study-plan-service";
import { isServiceError } from "@/lib/services/service-error";

export async function GET(req: Request) {
  try {
    const auth = requireAuthenticatedUser(req);
    if (auth instanceof Response) return auth;

    const plans = await listStudyPlansForUser(auth.sub);
    return NextResponse.json(plans);
  } catch (err) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/study-plans error:", err);
    return NextResponse.json({ error: "Failed to fetch study plans" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireAuthenticatedUser(req);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => ({}));
    const newPlan = await createStudyPlanForUser(auth.sub, body);

    return NextResponse.json(newPlan, { status: 201 });
  } catch (err) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/study-plans error:", err);
    return NextResponse.json({ error: "Failed to create study plan" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = requireAuthenticatedUser(req);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => ({}));
    const updated = await updateOwnedStudyPlan(auth.sub, body);

    return NextResponse.json(updated);
  } catch (err) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PUT /api/study-plans error:", err);
    return NextResponse.json({ error: "Failed to update study plan" }, { status: 500 });
  }
}
