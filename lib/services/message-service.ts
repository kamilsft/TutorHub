import { prisma } from "@/lib/prisma";
import {
  getConversation,
  listThreadsForUser,
  markThreadRead,
  sendMessage,
} from "@/lib/messages";
import { ServiceError } from "@/lib/services/service-error";
import { validateMessageSendPayload } from "@/lib/validation";

type SerializedMessage = {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  senderId: string;
  receiverId: string;
};

type MessageThreadResponse = {
  peer: { id: string; fullName: string; email: string };
  messages: SerializedMessage[];
};

type SendMessageResponse = {
  message: SerializedMessage;
};

export async function listMessageThreadsForUser(userId: string) {
  return listThreadsForUser(userId);
}

export async function getMessageThreadForUser(
  userId: string,
  peerId: string
): Promise<MessageThreadResponse> {
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
    messages: messages.map((message): SerializedMessage => ({
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
}): Promise<SendMessageResponse> {
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
