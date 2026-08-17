import { ALLSENDER_BASE_URL } from "@/constants/allsender";
import type { BootstrapResponse, Chat, Message, TeamResponse } from "./types";

export class AllSenderApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
    this.name = "AllSenderApiError";
  }
}

type RequestOptions = RequestInit & { expectJson?: boolean };

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${ALLSENDER_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AllSenderApiError(
      response.status,
      payload?.message || payload?.error_description || payload?.error || `Error HTTP ${response.status}`,
      payload?.code,
    );
  }
  return payload as T;
}

export type SessionUser = {
  id: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  deletedAt?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const payload = await request<SessionUser | null>("/api/user");
  if (!payload || !payload.id) return null;
  return payload;
}

export async function getCurrentTeam(): Promise<TeamResponse> {
  return request<TeamResponse>("/api/team");
}

export async function getBootstrap(): Promise<BootstrapResponse> {
  return request<BootstrapResponse>("/api/chat-mobile/bootstrap");
}

export async function listChats(): Promise<Chat[]> {
  const payload = await request<{ ok?: boolean; chats?: Chat[]; teamRole?: string; canSeeAll?: boolean }>(
    "/api/chat-mobile/chats",
  );
  return Array.isArray(payload?.chats) ? payload.chats : [];
}

export async function listMessages(chat: Pick<Chat, "id" | "jid" | "instanceId">): Promise<Message[]> {
  const params = new URLSearchParams({ jid: chat.jid });
  if (chat.instanceId) params.set("instanceId", String(chat.instanceId));
  const payload = await request<{ ok?: boolean; messages?: Message[] }>(
    `/api/chat-mobile/messages?${params.toString()}`,
  );
  return Array.isArray(payload?.messages) ? payload.messages : [];
}

function normalizeSentMessage(payload: any, fallbackText = ""): Message {
  if (payload?.direction && payload?.body !== undefined) return payload as Message;
  return {
    id: String(payload?.id || payload?.messageId || payload?.message_id || `sent-${Date.now()}`),
    direction: "outbound",
    senderType: "agent",
    body: String(payload?.body ?? payload?.text ?? fallbackText),
    mediaUrl: payload?.mediaUrl ?? payload?.media_url ?? null,
    mediaType: payload?.mediaType ?? payload?.messageType ?? "text",
    createdAt: payload?.createdAt ?? payload?.timestamp ?? new Date().toISOString(),
    status: payload?.status ?? "sent",
  };
}

export async function sendText(chat: Pick<Chat, "id" | "jid" | "instanceId">, text: string): Promise<Message> {
  const payload = await request<any>("/api/chat-mobile/send", {
    method: "POST",
    body: JSON.stringify({
      recipientJid: chat.jid,
      text,
      instanceId: chat.instanceId || undefined,
    }),
  });
  return normalizeSentMessage(payload, text);
}

export async function markChatRead(chatId: number) {
  return request<{ ok?: boolean }>("/api/chats/mark-read", {
    method: "POST",
    body: JSON.stringify({ chatId }),
  });
}

export async function takeChat(chat: Pick<Chat, "id" | "jid" | "instanceId">) {
  return request<{ ok?: boolean; message?: string; error?: string }>("/api/chat-mobile/take-chat", {
    method: "POST",
    body: JSON.stringify({
      chatId: chat.id,
      jid: chat.jid,
      instanceId: chat.instanceId || undefined,
      source: "mobile",
    }),
  });
}

export async function sendMedia(
  chat: Pick<Chat, "jid" | "instanceId">,
  input: { base64: string; mimeType: string; fileName: string },
) {
  return request<any>("/api/chat-mobile/sendMedia", {
    method: "POST",
    body: JSON.stringify({
      recipientJid: chat.jid,
      fileBase64: input.base64,
      mimeType: input.mimeType,
      fileName: input.fileName,
      instanceId: chat.instanceId || undefined,
    }),
  });
}

export async function sendAudio(
  chat: Pick<Chat, "jid" | "instanceId">,
  input: { base64: string; mimeType: string },
) {
  return request<any>("/api/chat-mobile/sendAudio", {
    method: "POST",
    body: JSON.stringify({
      recipientJid: chat.jid,
      audioBase64: input.base64,
      audioMimeType: input.mimeType,
      instanceId: chat.instanceId || undefined,
    }),
  });
}

export async function sendLocation(
  chat: Pick<Chat, "jid" | "instanceId">,
  input: { latitude: number; longitude: number; name?: string; address?: string },
) {
  return request<any>("/api/chat-mobile/send-location", {
    method: "POST",
    body: JSON.stringify({
      recipientJid: chat.jid,
      latitude: input.latitude,
      longitude: input.longitude,
      name: input.name || "Ubicación",
      address: input.address || "",
      instanceId: chat.instanceId || undefined,
    }),
  });
}

export async function toggleChatAi(chatId: number, instanceId: number | null | undefined, enabled: boolean) {
  return request<{ ok?: boolean }>("/api/chat-mobile/ai/toggle", {
    method: "POST",
    body: JSON.stringify({ chatId, instanceId: instanceId || undefined, enabled }),
  });
}

export async function registerDevice(input: {
  deviceId: string;
  platform: "ios" | "android";
  pushToken: string;
  appVersion?: string | null;
  deviceName?: string | null;
}) {
  return request<{ ok?: boolean }>("/api/mobile/register-device", {
    method: "POST",
    body: JSON.stringify({
      deviceId: input.deviceId,
      expoPushToken: input.pushToken,
      platform: input.platform,
      app: "allsender-mobile",
      appVersion: input.appVersion || undefined,
      deviceName: input.deviceName || undefined,
    }),
  });
}
