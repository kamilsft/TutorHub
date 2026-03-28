import { prisma } from "@/lib/prisma";
import {
  getConversation,
  listThreadsForUser,
  markThreadRead,
  sendMessage,
} from "@/lib/messages";
import { ServiceError } from "@/lib/services/service-error";
import { validateMessageSendPayload } from "@/lib/validation";

export async function listMessageThreadsForUser(userId: string) {
  return listThreadsForUser(userId);
}

export async function getMessageThreadForUser(userId: string, peerId: string) {
  if (!peerId) {
    throw new ServiceError("User id is required", 400);
  }

  if (peerId === userId) {
    throw new ServiceError("Cannot message yourself", 400);
  }

  const peer = await prisma.user.findUnique({ where: { id: peerId } });
  if (!peer) {
    throw new ServiceError("User not found", 404);
  }

  const messages = await getConversation(userId, peerId, 200);
  await markThreadRead(userId, peerId);

  return {
    peer: { id: peer.id, fullName: peer.fullName, email: peer.email },
    messages: messages.map((message: typeof messages[number]) => ({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      isRead: message.isRead,
      senderId: message.senderId,
      receiverId: message.receiverId,
    })),
  };
}

export async function sendMessageFromUser(input: {
  senderId: string;
  receiverId: string;
  content: string;
}) {
  const payload = validateMessageSendPayload(input);

  if (payload.receiverId === input.senderId) {
    throw new ServiceError("Cannot message yourself", 400);
  }

  const receiver = await prisma.user.findUnique({ where: { id: payload.receiverId } });
  if (!receiver) {
    throw new ServiceError("Receiver not found", 404);
  }

  const message = await sendMessage({
    senderId: input.senderId,
    receiverId: payload.receiverId,
    content: payload.content,
  });

  return {
    message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        isRead: message.isRead,
        senderId: message.senderId,
        receiverId: message.receiverId,
      },
    };
}
