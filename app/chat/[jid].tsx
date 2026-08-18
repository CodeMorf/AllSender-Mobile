import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { File } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { MOBILE_SYNC_INTERVAL_MS } from "@/constants/allsender";
import { useAllSenderAuth } from "@/lib/allsender/auth-context";
import { useAllSenderRealtime } from "@/lib/allsender/realtime-context";
import { useLiveSync } from "@/hooks/use-live-sync";
import { assignChatAgent, createChatContact, getChatContact, getCurrentTeam, listMessages, markChatRead, sendAudio, sendLocation, sendMedia, sendText, takeChat, toggleChatAi, updateContactNotes } from "@/lib/allsender/api";
import type { Chat, MobileContact, Message, TeamMember } from "@/lib/allsender/types";

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
  const params = useLocalSearchParams<{ jid: string; chatId?: string; instanceId?: string; contactId?: string; name?: string; channel?: string; aiActive?: string; assignedAgentId?: string; assignedAgentName?: string }>();
  const chatId = Number(params.chatId || 0);
  const chat = useMemo<Chat>(() => ({
    id: chatId,
    contactId: params.contactId ? Number(params.contactId) : null,
    jid: String(params.jid || ""),
    instanceId: params.instanceId ? Number(params.instanceId) : null,
    name: String(params.name || params.jid || "Contacto"),
    channel: String(params.channel || "chat"),
    unreadCount: 0,
    aiActive: params.aiActive === "true",
  }), [chatId, params.aiActive, params.channel, params.contactId, params.instanceId, params.jid, params.name]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [taking, setTaking] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [aiActive, setAiActive] = useState(chat.aiActive === true);
  const [contact, setContact] = useState<MobileContact | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showActions, setShowActions] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [contactName, setContactName] = useState(chat.name);
  const [contactNotes, setContactNotes] = useState("");
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

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getChatContact(chat).catch(() => null),
      getCurrentTeam().catch(() => null),
    ]).then(([nextContact, team]) => {
      if (cancelled) return;
      if (nextContact) {
        setContact(nextContact);
        setContactName(nextContact.name || chat.name);
        setContactNotes(nextContact.notes || "");
      }
      const members = (team?.teamMembers || []).map((member) => ({
        id: Number(member.userId || member.id || 0),
        name: member.user?.name || member.user?.email || `Usuario ${member.userId || member.id || ""}`,
        email: member.user?.email || null,
        role: member.role || null,
      })).filter((member) => member.id > 0);
      setTeamMembers(members);
    });
    return () => { cancelled = true; };
  }, [chat]);

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

  async function pickAndSendMedia() {
    if (!chat.id || sendingMedia) return;
    setShowActions(false);
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Necesitas permitir el acceso a tus fotos para adjuntar un archivo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.85,
        selectionLimit: 1,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.uri) return;
      setSendingMedia(true);
      const file = new File(asset.uri);
      const base64 = await file.base64();
      if (base64.length > 18_000_000) throw new Error("El archivo supera el límite móvil de 12 MB.");
      const mimeType = asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg");
      await sendMedia(chat, { base64, mimeType, fileName: asset.fileName || `allsender-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}` });
      await loadMessages(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar la imagen o video.");
    } finally {
      setSendingMedia(false);
    }
  }

  async function pickAndSendDocument() {
    if (!chat.id || sendingMedia) return;
    setShowActions(false);
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: "*/*" });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.uri) return;
      setSendingMedia(true);
      const file = new File(asset.uri);
      const base64 = await file.base64();
      if (base64.length > 18_000_000) throw new Error("El documento supera el límite móvil de 12 MB.");
      await sendMedia(chat, { base64, mimeType: asset.mimeType || "application/octet-stream", fileName: asset.name || `documento-${Date.now()}` });
      await loadMessages(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el documento.");
    } finally {
      setSendingMedia(false);
    }
  }

  async function shareLocation() {
    if (!chat.id || sharingLocation) return;
    setShowActions(false);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError("Necesitas permitir la ubicación para compartirla en el chat.");
        return;
      }
      setSharingLocation(true);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await sendLocation(chat, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        name: "Ubicación compartida",
      });
      await loadMessages(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo compartir la ubicación.");
    } finally {
      setSharingLocation(false);
    }
  }

  async function toggleAi() {
    if (!chat.id) return;
    setShowActions(false);
    try {
      const enabled = !aiActive;
      await toggleChatAi(chat.id, chat.instanceId, enabled);
      setAiActive(enabled);
      await loadMessages(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la IA de este chat.");
    }
  }

  async function transferTo(agentId: number | null) {
    setShowTransfer(false);
    if (!agentId && !contact?.id) return;
    try {
      let contactId = contact?.id;
      if (!contactId) {
        const created = await createChatContact({ jid: chat.jid, name: contactName.trim() || chat.name });
        contactId = created.id;
        setContact(created);
      }
      await assignChatAgent(contactId, agentId);
      setError(agentId ? "Conversación transferida correctamente." : "Conversación quedó sin asignar.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo transferir la conversación.");
    }
  }

  async function saveContact() {
    const name = contactName.trim();
    if (!name || creatingContact) return;
    setCreatingContact(true);
    try {
      const saved = contact?.id
        ? await updateContactNotes(contact.id, contactNotes.trim())
        : await createChatContact({ jid: chat.jid, name, notes: contactNotes.trim() });
      setContact(saved);
      setShowContact(false);
      setError(contact?.id ? "Nota del cliente actualizada en CRM." : "Cliente guardado en CRM.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el cliente.");
    } finally {
      setCreatingContact(false);
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
          <Pressable onPress={() => void toggleAi()} className={`mr-1 h-10 w-10 items-center justify-center rounded-xl ${aiActive ? "bg-primary/15" : "bg-surface"}`} accessibilityLabel={aiActive ? "Pausar inteligencia artificial" : "Activar inteligencia artificial"}>
            <IconSymbol name="sparkles" size={19} color={aiActive ? colors.primary : colors.muted} />
          </Pressable>
          <Pressable onPress={() => setShowActions(true)} className="h-10 w-10 items-center justify-center rounded-xl bg-surface" accessibilityLabel="Acciones del chat">
            <IconSymbol name="ellipsis.circle" size={22} color={colors.foreground} />
          </Pressable>
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
                {item.body ? <Text className={`text-[15px] leading-5 ${outgoing ? "text-white" : "text-foreground"}`}>{item.body}</Text> : null}
                {item.mediaType === "location" && item.locationLatitude && item.locationLongitude ? (
                  <Pressable onPress={() => void Linking.openURL(`https://maps.google.com/?q=${item.locationLatitude},${item.locationLongitude}`)} className="mt-2">
                    <Text className={`text-sm font-semibold ${outgoing ? "text-white" : "text-primary"}`}>Abrir ubicación</Text>
                  </Pressable>
                ) : null}
                <View className="mt-1.5 flex-row items-center justify-end">
                  <Text className={`text-[10px] ${outgoing ? "text-white/70" : "text-muted"}`}>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</Text>
                  {item.status === "failed" ? <Text className="ml-2 text-[10px] font-bold text-error">No enviado</Text> : null}
                </View>
              </View>
            );
          }}
        />

        <View className="flex-row items-end border-t border-border bg-background px-3 py-3">
          <Pressable onPress={() => setShowActions(true)} disabled={sendingMedia || sharingLocation} className="mr-1 h-11 w-11 items-center justify-center rounded-full bg-surface border border-border" accessibilityLabel="Adjuntar contenido">
            {sendingMedia || sharingLocation ? <ActivityIndicator size="small" color={colors.primary} /> : <IconSymbol name="plus" size={21} color={colors.primary} />}
          </Pressable>
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
              {sending ? <ActivityIndicator size="small" color={colors.foreground} /> : <IconSymbol name="paperplane.fill" size={19} color={colors.foreground} />}
            </Pressable>
          ) : (
            <Pressable
              disabled={sendingVoice}
              onPress={() => void toggleVoiceRecording()}
              style={({ pressed }) => [{ opacity: pressed || sendingVoice ? 0.55 : 1 }]}
              className={`ml-1 h-11 w-11 items-center justify-center rounded-full ${recorderState.isRecording ? "bg-error" : "bg-primary"}`}
            >
              {sendingVoice ? (
                <ActivityIndicator size="small" color={colors.foreground} />
              ) : (
                <IconSymbol name={recorderState.isRecording ? "stop.fill" : "mic.fill"} size={20} color={colors.foreground} />
              )}
            </Pressable>
          )}
        </View>

        <Modal visible={showActions} transparent animationType="slide" onRequestClose={() => setShowActions(false)}>
          <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setShowActions(false)}>
            <Pressable className="rounded-t-3xl bg-background px-5 pb-8 pt-5" onPress={(event) => event.stopPropagation()}>
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-foreground">Acciones de la conversación</Text>
                <Pressable onPress={() => setShowActions(false)}><IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} /></Pressable>
              </View>
              <View className="flex-row flex-wrap gap-3">
                <Pressable onPress={() => void pickAndSendMedia()} className="w-[30%] items-center rounded-2xl border border-border bg-surface px-2 py-4">
                  <IconSymbol name="photo.fill" size={25} color={colors.primary} /><Text className="mt-2 text-center text-xs font-semibold text-foreground">Imagen o video</Text>
                </Pressable>
                <Pressable onPress={() => void pickAndSendDocument()} className="w-[30%] items-center rounded-2xl border border-border bg-surface px-2 py-4">
                  <IconSymbol name="doc.fill" size={25} color={colors.primary} /><Text className="mt-2 text-center text-xs font-semibold text-foreground">Documento</Text>
                </Pressable>
                <Pressable onPress={() => void shareLocation()} className="w-[30%] items-center rounded-2xl border border-border bg-surface px-2 py-4">
                  <IconSymbol name="location.fill" size={25} color={colors.primary} /><Text className="mt-2 text-center text-xs font-semibold text-foreground">Ubicación</Text>
                </Pressable>
                <Pressable onPress={() => { setShowActions(false); setShowTransfer(true); }} className="w-[30%] items-center rounded-2xl border border-border bg-surface px-2 py-4">
                  <IconSymbol name="person.2" size={25} color={colors.primary} /><Text className="mt-2 text-center text-xs font-semibold text-foreground">Transferir</Text>
                </Pressable>
                <Pressable onPress={() => { setShowActions(false); setShowContact(true); }} className="w-[30%] items-center rounded-2xl border border-border bg-surface px-2 py-4">
                  <IconSymbol name="person.badge.plus" size={25} color={colors.primary} /><Text className="mt-2 text-center text-xs font-semibold text-foreground">Cliente / CRM</Text>
                </Pressable>
                <Pressable onPress={() => void toggleAi()} className="w-[30%] items-center rounded-2xl border border-border bg-surface px-2 py-4">
                  <IconSymbol name="sparkles" size={25} color={aiActive ? colors.primary : colors.muted} /><Text className="mt-2 text-center text-xs font-semibold text-foreground">{aiActive ? "Pausar IA" : "Activar IA"}</Text>
                </Pressable>
              </View>
              {contact ? <Text className="mt-4 text-xs text-muted">CRM: {contact.name}{contact.assignedUser?.name ? ` · ${contact.assignedUser.name}` : " · sin asignar"}</Text> : <Text className="mt-4 text-xs text-muted">Este contacto aún no está guardado en CRM.</Text>}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={showTransfer} transparent animationType="slide" onRequestClose={() => setShowTransfer(false)}>
          <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setShowTransfer(false)}>
            <Pressable className="max-h-[75%] rounded-t-3xl bg-background px-5 pb-8 pt-5" onPress={(event) => event.stopPropagation()}>
              <Text className="mb-1 text-lg font-bold text-foreground">Transferir conversación</Text>
              <Text className="mb-4 text-sm text-muted">Selecciona un miembro autorizado de tu equipo.</Text>
              <ScrollView>
                {teamMembers.map((member) => (
                  <Pressable key={member.id} onPress={() => void transferTo(member.id)} className="mb-2 flex-row items-center rounded-2xl border border-border bg-surface px-4 py-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10"><Text className="font-bold text-primary">{member.name.slice(0, 1).toUpperCase()}</Text></View>
                    <View className="ml-3 flex-1"><Text className="font-semibold text-foreground">{member.name}</Text><Text className="text-xs text-muted">{member.role || member.email || "Miembro del equipo"}</Text></View>
                  </Pressable>
                ))}
                <Pressable onPress={() => void transferTo(null)} className="mt-2 rounded-2xl border border-error/25 bg-error/10 px-4 py-3"><Text className="text-center font-semibold text-error">Dejar sin asignar</Text></Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={showContact} transparent animationType="slide" onRequestClose={() => setShowContact(false)}>
          <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setShowContact(false)}>
            <Pressable className="rounded-t-3xl bg-background px-5 pb-8 pt-5" onPress={(event) => event.stopPropagation()}>
              <Text className="mb-1 text-lg font-bold text-foreground">{contact ? "Cliente en CRM" : "Nuevo cliente"}</Text>
              <Text className="mb-4 text-sm text-muted">Guarda los datos para que todo el equipo los vea según sus permisos.</Text>
              <Text className="mb-1 text-xs font-semibold text-muted">Nombre</Text>
              <TextInput value={contactName} onChangeText={setContactName} editable={!contact} className="mb-3 rounded-2xl border border-border bg-surface px-4 py-3 text-foreground" placeholder="Nombre del cliente" placeholderTextColor={colors.muted} />
              <Text className="mb-1 text-xs font-semibold text-muted">Nota interna</Text>
              <TextInput value={contactNotes} onChangeText={setContactNotes} multiline className="min-h-20 rounded-2xl border border-border bg-surface px-4 py-3 text-foreground" placeholder="Información útil para el equipo" placeholderTextColor={colors.muted} />
              <Pressable onPress={() => void saveContact()} disabled={creatingContact} className="mt-4 items-center rounded-2xl bg-primary px-4 py-3.5">
                {creatingContact ? <ActivityIndicator color={colors.foreground} /> : <Text className="font-bold text-white">{contact ? "Contacto guardado" : "Guardar cliente"}</Text>}
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
