import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { MOBILE_SYNC_INTERVAL_MS } from "@/constants/allsender";
import { useLiveSync } from "@/hooks/use-live-sync";
import { listChats } from "@/lib/allsender/api";
import { useAllSenderAuth } from "@/lib/allsender/auth-context";
import { useAllSenderRealtime } from "@/lib/allsender/realtime-context";
import type { Chat } from "@/lib/allsender/types";
import { playLocalChatAlert } from "@/lib/notifications";

function channelLabel(channel: string) {
  const value = String(channel || "").toLowerCase();
  if (value.includes("whatsapp")) return "WhatsApp";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("facebook") || value.includes("messenger")) return "Facebook";
  if (value.includes("web")) return "Web Chat";
  return "Chat";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C";
}

export default function InboxScreen() {
  const colors = useColors();
  const router = useRouter();
  const auth = useAllSenderAuth();
  const realtime = useAllSenderRealtime();
  const [chats, setChats] = useState<Chat[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousRef = useRef<Map<number, { lastMessageId?: string | null; unreadCount: number }>>(new Map());
  const firstLoadRef = useRef(true);

  const loadChats = useCallback(async (quiet = false) => {
    if (!quiet) setError(null);
    try {
      const result = await listChats();
      if (!firstLoadRef.current) {
        for (const chat of result) {
          const previous = previousRef.current.get(chat.id);
          if (
            previous &&
            chat.lastMessageId &&
            chat.lastMessageId !== previous.lastMessageId &&
            !chat.lastMessageFromMe &&
            chat.unreadCount > previous.unreadCount
          ) {
            void playLocalChatAlert(chat.name, chat.lastMessage || "Nuevo mensaje", {
              chatId: chat.id,
              jid: chat.jid,
              instanceId: chat.instanceId || 0,
              name: chat.name,
              channel: chat.channel,
              messageId: chat.lastMessageId || "",
            });
          }
        }
      }
      const nextMap = new Map<number, { lastMessageId?: string | null; unreadCount: number }>();
      result.forEach((chat) => nextMap.set(chat.id, { lastMessageId: chat.lastMessageId, unreadCount: chat.unreadCount }));
      previousRef.current = nextMap;
      firstLoadRef.current = false;
      setChats(result);
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : "No se pudo cargar la bandeja.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadChats(); }, [loadChats]);

  useEffect(() => realtime.addListener((event) => {
    if (["message.created", "message.updated", "message.status", "chat.updated", "chat.assigned", "chat.unread", "chat.archived"].includes(event.event)) {
      void loadChats(true);
    }
  }), [loadChats, realtime]);

  useLiveSync(() => loadChats(true), MOBILE_SYNC_INTERVAL_MS, auth.status === "authenticated");

  const visibleChats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return chats.filter((chat) => {
      if (filter === "unread" && chat.unreadCount <= 0) return false;
      if (!needle) return true;
      return `${chat.name} ${chat.phone || ""} ${chat.lastMessage || ""} ${(chat.tags || []).join(" ")}`.toLowerCase().includes(needle);
    });
  }, [chats, filter, query]);

  const unreadTotal = chats.reduce((sum, chat) => sum + Math.max(0, Number(chat.unreadCount || 0)), 0);
  const teamName = auth.user?.team?.name || auth.bootstrap?.team?.name || "Tu equipo";
  const role = auth.user?.team?.role || auth.bootstrap?.team?.role || "miembro";

  return (
    <ScreenContainer className="px-4 pt-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-bold tracking-[2px] text-primary">ALLSENDER MOBILE</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">Conversaciones</Text>
          <View className="mt-2 flex-row items-center">
            <View className={`mr-2 h-2 w-2 rounded-full ${auth.status === "authenticated" ? "bg-success" : "bg-warning"}`} />
            <Text className="text-sm text-muted" numberOfLines={1}>{teamName} · {role} · Sincronización activa</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/settings")}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-surface border border-border"
          style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
        >
          <IconSymbol name="person.crop.circle.fill" size={23} color={colors.primary} />
        </Pressable>
      </View>
      <View className="mt-5 flex-row items-center rounded-2xl bg-surface border border-border px-4">
        <IconSymbol name="magnifyingglass" size={19} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar cliente, teléfono o etiqueta"
          placeholderTextColor={colors.muted}
          className="flex-1 px-3 py-3.5 text-foreground"
        />
        {query ? (
          <Pressable onPress={() => setQuery("")}><IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} /></Pressable>
        ) : null}
      </View>

      <View className="mt-3 flex-row gap-2">
        <Pressable onPress={() => setFilter("all")} className={`rounded-full px-4 py-2 ${filter === "all" ? "bg-primary" : "bg-surface border border-border"}`}>
          <Text className={`text-sm font-semibold ${filter === "all" ? "text-background" : "text-foreground"}`}>Todas</Text>
        </Pressable>
        <Pressable onPress={() => setFilter("unread")} className={`flex-row rounded-full px-4 py-2 ${filter === "unread" ? "bg-primary" : "bg-surface border border-border"}`}>
          <Text className={`text-sm font-semibold ${filter === "unread" ? "text-background" : "text-foreground"}`}>No leídas</Text>
          {unreadTotal > 0 ? <Text className={`ml-2 text-sm font-bold ${filter === "unread" ? "text-background" : "text-primary"}`}>{unreadTotal}</Text> : null}
        </Pressable>
      </View>

      {error ? (
        <View className="mt-4 rounded-2xl border border-error/25 bg-error/10 p-4">
          <Text className="font-semibold text-foreground">No pudimos sincronizar</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">{error}</Text>
          <Pressable onPress={() => void loadChats()} className="mt-3 self-start rounded-xl bg-primary px-4 py-2.5">
            <Text className="font-semibold text-background">Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={colors.primary} className="mt-10" /> : null}

      <FlatList
        className="mt-3"
        data={visibleChats}
        keyExtractor={(item) => `${item.id}-${item.instanceId || "default"}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadChats(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListEmptyComponent={!loading ? (
          <View className="items-center py-16">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-surface border border-border"><IconSymbol name="tray" size={25} color={colors.muted} /></View>
            <Text className="mt-4 font-semibold text-foreground">Sin conversaciones</Text>
            <Text className="mt-1 text-center text-sm text-muted">Cuando llegue un mensaje autorizado para tu usuario aparecerá aquí.</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({
              pathname: "/chat/[jid]",
              params: {
                jid: item.jid,
                chatId: String(item.id),
                instanceId: item.instanceId ? String(item.instanceId) : "",
                name: item.name,
                channel: item.channel,
                assignedAgentId: item.assignedAgentId ? String(item.assignedAgentId) : "",
                assignedAgentName: item.assignedAgentName || "",
              },
            })}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="mb-2.5 flex-row items-center rounded-3xl bg-surface px-4 py-4 border border-border"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Text className="text-base font-bold text-primary">{initials(item.name)}</Text>
            </View>
            <View className="ml-3 flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="mr-2 flex-1 font-semibold text-foreground" numberOfLines={1}>{item.name}</Text>
                <Text className="text-[11px] text-muted">{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</Text>
              </View>
              <View className="mt-1 flex-row items-center">
                <Text className="mr-2 text-[11px] font-semibold text-primary">{channelLabel(item.channel)}</Text>
                {item.branchName ? <Text className="text-[11px] text-muted">· {item.branchName}</Text> : null}
              </View>
              <View className="mt-1.5 flex-row items-center">
                <Text className={`flex-1 text-sm ${item.unreadCount > 0 ? "font-medium text-foreground" : "text-muted"}`} numberOfLines={1}>{item.lastMessage || "Sin mensajes"}</Text>
                {item.unreadCount > 0 ? (
                  <View className="ml-2 min-w-6 rounded-full bg-primary px-2 py-1"><Text className="text-center text-[11px] font-bold text-background">{item.unreadCount}</Text></View>
                ) : null}
              </View>
            </View>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}
