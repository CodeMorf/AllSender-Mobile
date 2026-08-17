export type AllSenderTeam = {
  id: number;
  name: string;
  role: string;
  planId?: number | null;
  planName?: string | null;
  canManageTeam?: boolean;
};

export type AllSenderUserInfo = {
  sub: string;
  id?: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  picture?: string | null;
  team?: AllSenderTeam | null;
};

export type TeamResponse = {
  ok?: boolean;
  id: number;
  name: string;
  planId?: number | null;
  planName?: string | null;
  myRole?: string | null;
  canManageTeam?: boolean;
  canUseSystem?: boolean;
  accessExpired?: boolean;
  teamMembers?: Array<{
    id?: number;
    userId?: number;
    role?: string;
    user?: { id?: number; name?: string | null; email?: string | null };
  }>;
  plan?: {
    id?: number | null;
    name?: string | null;
    status?: string | null;
    counterText?: string | null;
    renewalText?: string | null;
  };
};

export type BootstrapResponse = {
  ok: boolean;
  user: { id: number; name?: string | null; email?: string | null; role?: string | null };
  team: { id: number; name: string; planId?: number | null; planName?: string | null; role?: string | null };
  settings?: {
    soundEnabled?: boolean;
    vibrationEnabled?: boolean;
    notificationsEnabled?: boolean;
    darkMode?: boolean;
    initialView?: string;
  };
  firebase?: {
    enabled?: boolean;
    supported?: boolean;
    permission?: string;
    tokenRegistered?: boolean;
    projectId?: string | null;
    senderId?: string | null;
    error?: string | null;
  };
  firebaseConfig?: Record<string, string>;
};

export type Chat = {
  id: number;
  contactId?: number | null;
  jid: string;
  instanceId?: number | null;
  connectionId?: number | null;
  channel: string;
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
  company?: string | null;
  lastMessage?: string | null;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  lastMessageTimestamp?: string | null;
  lastMessageFromMe?: boolean;
  lastMessageStatus?: string | null;
  lastMessageId?: string | null;
  unreadCount: number;
  status?: string;
  aiActive?: boolean;
  assignedAgentId?: number | null;
  assignedAgentName?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  branchStatus?: string | null;
  tags?: string[];
  leadStatus?: string | null;
};

export type Message = {
  id: string;
  direction: "inbound" | "outbound";
  senderType?: "ai" | "agent" | "customer";
  senderName?: string | null;
  body: string;
  mediaUrl?: string | null;
  mediaType?: "text" | "image" | "video" | "audio" | "document" | "location" | string;
  mediaMimetype?: string | null;
  mediaSeconds?: number | null;
  mediaIsPtt?: boolean | null;
  locationLatitude?: number | string | null;
  locationLongitude?: number | string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  createdAt?: string | null;
  createdAtRaw?: string | null;
  timestamp?: string | null;
  status?: string | null;
};
