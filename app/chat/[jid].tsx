import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { File } from "expo-file-system";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { MOBILE_SYNC_INTERVAL_MS } from "@/constants/allsender";
import { useAllSenderAuth } from "@/lib/allsender/auth-context";
import { useAllSenderRealtime } from "@/lib/allsender/realtime-context";
import { useLiveSync } from "@/hooks/use-live-sync";
import { listMessages, markChatRead, sendAudio, sendText, takeChat } from "@/lib/allsender/api";
import type { Chat, Message } from "@/lib/allsender/types";

function renderMedia(message: Message, colors: ReturnType<typeof useColors>) {
  if (!message.mediaUrl) return null;
  if (message.mediaType === "image") {
    return <Image source={{ uri: message.mediaUrl }} style={{ width: 220, height: 180, borderRadius: 14, marginBottom: 8 }} contentFit="cover" />;
  }
  const label = message.mediaType === "audio" ? "Escuchar audio" : message.mediaType === "video" ? "Abrir video" : "Abrir archivo";
  return (
    <Pressable onPress={() => void Linking.openURL(message.mediaUrl!)} className="mb-2 flex-row items-center rounded-xl bg-background/15 px-3 py-2">
      <IconSymbol name={message.mediaType === "audio" ? "waveform" : "paperclip"} size={17} color={colors.primary} />
      <Text className="ml-2 text-sm font-semibold text-primary">{label}</Text>
    </Pressable>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const router = useRouter();
  const auth = useAllSenderAuth();
  const realtime = useAllSenderRealtime();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const params = useLocalSearchParams<{ jid: string; chatId?: string; instanceId?: string; name?: string; channel?: string; assignedAgentId?: string; assignedAgentName?: string }>();
  const chatId = Number(params.chatId || 0);
  const chat = useMemo<Chat>(() => ({
    id: chatId,
    jid: String(params.jid || ""),
    instanceId: params.instanceId ? Number(params.instanceId) : null,
    name: String(params.name || params.jid || "Contacto"),
    channel: String(params.channel || "chat"),
    unreadCount: 0,
  }), [chatId, params.channel, params.instanceId, params.jid, params.name]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [taking, setTaking] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const lastReadInboundRef = useRef<string | null>(null);

  const loadMessages = useCallback(async (quiet = false) => {
    if (!chat.id) return;
    if (!quiet) setError(null);
    try {
      const result = await listMessages(chat);
      setMessages((current) => {
        const currentLast = current[current.length - 1]?.id;
        const nextLast = result[result.length - 1]?.id;
        return currentLast === nextLast && current.length === result.length ? current : result;
      });
      const lastInbound = [...result].reverse().find((message) => message.direction === "inbound");
      if (lastInbound?.id && lastReadInboundRef.current !== lastInbound.id) {
        lastReadInboundRef.current = lastInbound.id;
        void markChatRead(chat.id).catch(() => undefined);
      }
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los mensajes.");
    } finally {
      setLoading(false);
    }
  }, [chat]);

  useEffect(() => { void loadMessages(); }, [loadMessages]);

  useEffect(() => realtime.addListener((event) => {
    const payload: Record<string, unknown> = event.data && typeof event.data === "object"
      ? event.data as Record<string, unknown>
      : {};
    const chatPayload = payload.chat && typeof payload.chat === "object"
      ? payload.chat as Record<string, unknown>
      : {};
    const eventChatId = Number(payload.chatId || payload.chat_id || chatPayload.id || 0);
    if (["message.created", "message.updated", "message.status", "chat.updated", "chat.assigned"].includes(event.event) && (!eventChatId || eventChatId === chat.id)) {
      void loadMessages(true);
    }
  }), [chat.id, loadMessages, realtime]);

  useLiveSync(() => loadMessages(true), MOBILE_SYNC_INTERVAL_MS, Boolean(chat.id));

  useEffect(() => {
    if (messages.length) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length]);

  async function send() {
    const value = text.trim();
    if (!value || sending || !chat.id) return;
    setSending(true);
    setError(null);
    const optimisticId = `local-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      direction: "outbound",
      senderType: "agent",
      body: value,
      mediaType: "text",
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setMessages((current) => [...current, optimistic]);
    setText("");
    try {
      const sent = await sendText(chat, value);
      setMessages((current) => current.map((item) => item.id === optimisticId ? sent : item));
    } catch (cause) {
      setMessages((current) => current.map((item) => item.id === optimisticId ? { ...item, status: "failed" } : item));
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  async function toggleVoiceRecording() {
    if (!chat.id || sendingVoice) return;
    setError(null);

    if (recorderState.isRecording) {
      setSendingVoice(true);
      try {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        if (!uri) throw new Error("No se pudo obtener la nota de voz grabada.");
        const file = new File(uri);
        const base64 = await file.base64();
        await sendAudio(chat, { base64, mimeType: file.type || "audio/mp4" });
        await loadMessages(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo enviar la nota de voz.");
      } finally {
        setSendingVoice(false);
        void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
      }
      return;
    }

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Necesitas permitir el micrófono para enviar notas de voz.");
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar la grabación.");
    }
  }

  async function take() {
    if (!chat.id || taking) return;
    setTaking(true);
    try {
      const result = await takeChat(chat);
      if (result.message) setError(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo tomar la conversación.");
    } finally {
      setTaking(false);
    }
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={4}>
        <View className="flex-row items-center border-b border-border bg-background px-4 py-3">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-xl" style={({ pressed }) => [{ opacity: pressed ? 0.55 : 1 }]}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <View className="ml-1 h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Text className="font-bold text-primary">{chat.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-semibold text-foreground" numberOfLines={1}>{chat.name}</Text>
            <View className="mt-0.5 flex-row items-center"><View className={`mr-1.5 h-1.5 w-1.5 rounded-full bg-success`} /><Text className="text-xs text-muted">Sincronización activa · {chat.channel}</Text></View>
          </View>
          {params.assignedAgentId && Number(params.assignedAgentId) === Number(auth.user?.sub || 0) ? (
            <View className="rounded-xl bg-success/10 px-3 py-2"><Text className="text-xs font-bold text-success">Asignado a ti</Text></View>
          ) : params.assignedAgentId ? (
            <View className="max-w-28 rounded-xl bg-surface border border-border px-3 py-2"><Text numberOfLines={1} className="text-xs font-semibold text-muted">{params.assignedAgentName || "Asignado"}</Text></View>
          ) : (
            <Pressable onPress={() => void take()} disabled={taking} className="rounded-xl bg-primary/10 px-3 py-2">
              <Text className="text-xs font-bold text-primary">{taking ? "Tomando…" : "Tomar chat"}</Text>
            </Pressable>
          )}
        </View>

        {loading ? <ActivityIndicator color={colors.primary} className="mt-8" /> : null}
        {error ? <View className="mx-4 mt-3 rounded-xl bg-error/10 px-4 py-3"><Text className="text-sm text-error">{error}</Text></View> : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 14 }}
          ListEmptyComponent={!loading ? <Text className="mt-10 text-center text-sm text-muted">Aún no hay mensajes en esta conversación.</Text> : null}
          renderItem={({ item }) => {
            const outgoing = item.direction === "outbound";
            return (
              <View className={`mb-2.5 max-w-[86%] rounded-3xl px-3.5 py-3 ${outgoing ? "self-end bg-primary" : "self-start bg-surface border border-border"}`}>
                {renderMedia(item, colors)}
                {item.body ? <Text className={`text-[15px] leading-5 ${outgoing ? "text-background" : "text-foreground"}`}>{item.body}</Text> : null}
                {item.mediaType === "location" && item.locationLatitude && item.locationLongitude ? (
                  <Pressable onPress={() => void Linking.openURL(`https://maps.google.com/?q=${item.locationLatitude},${item.locationLongitude}`)} className="mt-2">
                    <Text className={`text-sm font-semibold ${outgoing ? "text-background" : "text-primary"}`}>Abrir ubicación</Text>
                  </Pressable>
                ) : null}
                <View className="mt-1.5 flex-row items-center justify-end">
                  <Text className={`text-[10px] ${outgoing ? "text-background/70" : "text-muted"}`}>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</Text>
                  {item.status === "failed" ? <Text className="ml-2 text-[10px] font-bold text-error">No enviado</Text> : null}
                </View>
              </View>
            );
          }}
        />

        <View className="flex-row items-end border-t border-border bg-background px-3 py-3">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colors.muted}
            multiline
            className="max-h-28 flex-1 rounded-3xl bg-surface border border-border px-4 py-3 text-foreground"
          />
          {text.trim() ? (
            <Pressable
              disabled={sending}
              onPress={() => void send()}
              style={({ pressed }) => [{ opacity: pressed || sending ? 0.55 : 1 }]}
              className="ml-1 h-11 w-11 items-center justify-center rounded-full bg-primary"
            >
              {sending ? <ActivityIndicator size="small" color={colors.background} /> : <IconSymbol name="paperplane.fill" size={19} color={colors.background} />}
            </Pressable>
          ) : (
            <Pressable
              disabled={sendingVoice}
              onPress={() => void toggleVoiceRecording()}
              style={({ pressed }) => [{ opacity: pressed || sendingVoice ? 0.55 : 1 }]}
              className={`ml-1 h-11 w-11 items-center justify-center rounded-full ${recorderState.isRecording ? "bg-error" : "bg-primary"}`}
            >
              {sendingVoice ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <IconSymbol name={recorderState.isRecording ? "stop.fill" : "mic.fill"} size={20} color={colors.background} />
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
