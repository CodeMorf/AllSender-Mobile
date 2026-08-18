import { ALLSENDER_BASE_URL } from "@/constants/allsender";
import type { BootstrapResponse, Chat, Department, MobileAppShell, MobileContact, Message, MobileOrder, MobileRealtimeConfig, MobileReservation, RestappOrder, TeamMember, TeamResponse } from "./types";

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

  let response: Response;
  try {
    response = await fetch(`${ALLSENDER_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause || "");
    if (/failed to fetch|network request failed|load failed/i.test(message)) {
      throw new AllSenderApiError(0, "No pudimos conectar con AllSender. Comprueba tu conexión e inténtalo de nuevo.", "network_error");
    }
    throw cause;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      throw new AllSenderApiError(401, "Tu sesión expiró. Vuelve a iniciar sesión para continuar.", "session_expired");
    }
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

export async function getMobileAppShell(locale = "es"): Promise<MobileAppShell> {
  return request<MobileAppShell>(`/api/mobile/app-shell?locale=${encodeURIComponent(locale)}`);
}

export async function getMobileRealtimeConfig(): Promise<MobileRealtimeConfig> {
  return request<MobileRealtimeConfig>("/api/mobile/realtime/config");
}

export async function listMobileOrders(params: { status?: string; limit?: number } = {}): Promise<MobileOrder[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.limit) query.set("limit", String(params.limit));
  const payload = await request<{ ok?: boolean; data?: MobileOrder[] }>(`/api/mobile/orders${query.toString() ? `?${query}` : ""}`);
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function updateMobileOrder(id: number, input: Record<string, unknown>) {
  return request<{ ok?: boolean; data?: MobileOrder }>(`/api/mobile/orders/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listMobileReservations(limit = 50): Promise<MobileReservation[]> {
  const payload = await request<{ ok?: boolean; bookings?: MobileReservation[]; data?: MobileReservation[] }>(`/api/mobile/reservations?limit=${encodeURIComponent(String(limit))}`);
  const rows = payload?.bookings || payload?.data;
  return Array.isArray(rows) ? rows : [];
}

export async function listMobileRestappOrders(params: { status?: string; limit?: number } = {}): Promise<RestappOrder[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.limit) query.set("limit", String(params.limit));
  const payload = await request<{ ok?: boolean; data?: RestappOrder[] }>(`/api/mobile/restapp/orders${query.toString() ? `?${query}` : ""}`);
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function updateMobileRestappOrderStatus(id: number, status: string) {
  return request<{ ok?: boolean; data?: RestappOrder }>("/api/mobile/restapp/orders", {
    method: "PATCH",
    body: JSON.stringify({ id, status }),
  });
}

export async function getActiveModules() {
  return request<Record<string, unknown>>("/api/modules/active");
}

export async function listChats(): Promise<Chat[]> {
  const payload = await request<{ ok?: boolean; chats?: Chat[]; teamRole?: string; canSeeAll?: boolean }>(
    "/api/chat-mobile/chats",
  );
  return Array.isArray(payload?.chats) ? payload.chats : [];
}

export async function startWhatsAppChat(phone: string): Promise<Chat> {
  const payload = await request<{ ok?: boolean; chat?: Chat }>('/api/chat-mobile/start-whatsapp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
  if (!payload?.chat) throw new Error('No se pudo iniciar la conversación.');
  return payload.chat;
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

export async function getChatContact(chat: Pick<Chat, "id" | "jid" | "instanceId">): Promise<MobileContact | null> {
  const params = new URLSearchParams({ chatId: String(chat.id), jid: chat.jid });
  if (chat.instanceId) params.set("instanceId", String(chat.instanceId));
  return request<MobileContact | null>(`/api/contacts/by-chat?${params.toString()}`);
}

export async function createChatContact(input: {
  jid: string;
  name: string;
  notes?: string;
  assignedUserId?: number | null;
}): Promise<MobileContact> {
  return request<MobileContact>("/api/contacts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listContacts(): Promise<MobileContact[]> {
  const payload = await request<MobileContact[]>("/api/contacts/list");
  return Array.isArray(payload) ? payload : [];
}

export async function assignChatAgent(contactId: number, agentId: number | null) {
  return request<MobileContact>(`/api/contacts/${contactId}/assign-agent`, {
    method: "PUT",
    body: JSON.stringify({ agentId }),
  });
}

export async function updateContactNotes(contactId: number, notes: string) {
  return request<MobileContact>(`/api/contacts/${contactId}/notes`, {
    method: 'PUT',
    body: JSON.stringify({ notes }),
  });
}

export async function getDepartments(): Promise<{ isActive?: boolean; departments: Department[]; members?: TeamMember[] }> {
  const payload = await request<{ isActive?: boolean; departments?: Department[]; members?: TeamMember[] }>("/api/departments");
  return { ...payload, departments: Array.isArray(payload?.departments) ? payload.departments : [], members: Array.isArray(payload?.members) ? payload.members : [] };
}

export async function getCrmBootstrap() {
  return request<{ ok?: boolean; crm?: { contacts?: MobileContact[]; funnels?: unknown[]; metrics?: Record<string, number> } | null }>("/api/chat-mobile/crm/bootstrap");
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
