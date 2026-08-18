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

export type TeamMember = {
  id: number;
  name: string;
  email?: string | null;
  role?: string | null;
};

export type MobileModule = {
  key: string;
  label: string;
  route: string;
  group: string;
  enabled: boolean;
};

export type MobileAppShell = {
  ok: boolean;
  user: { id: number; name?: string | null; email?: string | null; role?: string | null };
  team: { id: number; name: string; planId?: number | null };
  permissions?: Record<string, boolean>;
  navigation?: { home?: string; login?: string; chatMobile?: string };
  modules: MobileModule[];
  socialAccounts?: Array<{ platform: string; name: string; status: string }>;
  counters?: Record<string, number>;
};

export type MobileRealtimeConfig = {
  ok?: boolean;
  enabled?: boolean;
  provider?: "pusher";
  key?: string | null;
  cluster?: string | null;
  channel?: string | null;
  events?: string[];
};

export type MobileOrder = {
  id: number;
  order_number?: string | null;
  status?: string | null;
  channel?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  total?: number | string | null;
  payment_status?: string | null;
  shipment_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RestappOrder = {
  id: number;
  order_number?: string | null;
  status?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  total?: number | string | null;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MobileReservation = {
  id: number;
  customerName?: string | null;
  customerPhone?: string | null;
  serviceName?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  reservedAt?: string | null;
  status?: string | null;
  partySize?: number | null;
};

export type MobileContact = {
  id: number;
  chatId?: number | null;
  name: string;
  phone?: string | null;
  notes?: string | null;
  assignedUserId?: number | null;
  assignedUser?: { id?: number; name?: string | null; email?: string | null } | null;
  tags?: Array<{ id?: number; name?: string; color?: string }>;
  funnelStage?: { id?: number; name?: string } | null;
};

export type Department = {
  id?: string | number;
  code?: string;
  name: string;
  description?: string | null;
  memberUserIds?: number[];
  isActive?: boolean;
};
