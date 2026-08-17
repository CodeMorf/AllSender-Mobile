import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { useAllSenderAuth } from "@/lib/allsender/auth-context";

type NotificationData = {
  chatId?: string | number;
  chat_id?: string | number;
  jid?: string;
  instanceId?: string | number;
  instance_id?: string | number;
  name?: string;
  channel?: string;
};

function extractData(response: Notifications.NotificationResponse | null): NotificationData | null {
  if (!response) return null;
  const raw = response.notification.request.content.data || {};
  return raw as NotificationData;
}

export function NotificationRouter() {
  const router = useRouter();
  const auth = useAllSenderAuth();
  const pendingRef = useRef<NotificationData | null>(null);
  const lastResponseIdRef = useRef<string | null>(null);

  useEffect(() => {
    function receive(data: NotificationData | null, responseId?: string | null) {
      if (responseId && lastResponseIdRef.current === responseId) return;
      if (!data?.jid || !(data.chatId || data.chat_id)) return;
      if (responseId) lastResponseIdRef.current = responseId;
      pendingRef.current = data;
      if (auth.status === "authenticated") {
        const chatId = String(data.chatId || data.chat_id || "");
        router.push({
          pathname: "/chat/[jid]",
          params: {
            jid: String(data.jid),
            chatId,
            instanceId: String(data.instanceId || data.instance_id || ""),
            name: String(data.name || data.jid),
            channel: String(data.channel || "chat"),
          },
        });
        pendingRef.current = null;
      }
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => receive(extractData(response), response?.notification.request.identifier));
    const sub = Notifications.addNotificationResponseReceivedListener((response) => receive(extractData(response), response.notification.request.identifier));
    return () => sub.remove();
  }, [auth.status, router]);

  useEffect(() => {
    const data = pendingRef.current;
    if (auth.status !== "authenticated" || !data?.jid || !(data.chatId || data.chat_id)) return;
    router.push({
      pathname: "/chat/[jid]",
      params: {
        jid: String(data.jid),
        chatId: String(data.chatId || data.chat_id || ""),
        instanceId: String(data.instanceId || data.instance_id || ""),
        name: String(data.name || data.jid),
        channel: String(data.channel || "chat"),
      },
    });
    pendingRef.current = null;
  }, [auth.status, router]);

  return null;
}
