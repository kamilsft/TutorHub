import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import {
  getConversation,
  listThreadsForUser,
  markThreadRead,
  sendMessage,
} from "@/lib/messages";

/**
 * GET /api/messages           → { threads }
 * GET /api/messages?with=uuid → { messages } (marks incoming as read)
 */
export async function GET(request: Request) {
  const auth = requireAuthenticatedUser(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const withUserId = searchParams.get("with")?.trim();

  try {
    if (withUserId) {
      if (withUserId === auth.sub) {
        return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
      }
      const peer = await prisma.user.findUnique({ where: { id: withUserId } });
      if (!peer) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const messages = await getConversation(auth.sub, withUserId, 200);
      await markThreadRead(auth.sub, withUserId);

      return NextResponse.json({
        peer: { id: peer.id, fullName: peer.fullName, email: peer.email },
        messages: messages.map((m: typeof messages[number]) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
          isRead: m.isRead,
          senderId: m.senderId,
          receiverId: m.receiverId,
        })),
      });
    }

    const threads = await listThreadsForUser(auth.sub);
    return NextResponse.json({ threads });
  } catch (err) {
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
    const receiverId = typeof body.receiverId === "string" ? body.receiverId.trim() : "";
    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!receiverId) {
      return NextResponse.json({ error: "receiverId is required" }, { status: 400 });
    }
    if (receiverId === auth.sub) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }
    if (!content || content.length > 8000) {
      return NextResponse.json(
        { error: "content must be 1–8000 characters" },
        { status: 400 }
      );
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
    }

    const message = await sendMessage({
      senderId: auth.sub,
      receiverId,
      content,
    });

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        isRead: message.isRead,
        senderId: message.senderId,
        receiverId: message.receiverId,
      },
    });
  } catch (err: unknown) {
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
