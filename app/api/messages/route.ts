import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import {
  getMessageThreadForUser,
  listMessageThreadsForUser,
  sendMessageFromUser,
} from "@/lib/services/message-service";
import { isServiceError } from "@/lib/services/service-error";

/**
 * GET /api/messages           -> { threads }
 * GET /api/messages?with=uuid -> { messages } (marks incoming as read)
 */
export async function GET(request: Request) {
  const auth = requireAuthenticatedUser(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const withUserId = searchParams.get("with")?.trim();

  try {
    if (withUserId) {
      const thread = await getMessageThreadForUser(auth.sub, withUserId);
      return NextResponse.json(thread);
    }

    const threads = await listMessageThreadsForUser(auth.sub);
    return NextResponse.json({ threads });
  } catch (err) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/messages", err);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

/** POST /api/messages  body: { receiverId, content } */
export async function POST(request: Request) {
  const auth = requireAuthenticatedUser(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const result = await sendMessageFromUser({
      senderId: auth.sub,
      receiverId: typeof body.receiverId === "string" ? body.receiverId : "",
      content: typeof body.content === "string" ? body.content : "",
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    if (isServiceError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/messages", err);
    const detail =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to send message",
        ...(process.env.NODE_ENV === "development" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
