import Pusher from "pusher-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { getMobileRealtimeConfig } from "./api";
import { useAllSenderAuth } from "./auth-context";
import type { RealtimeEvent } from "./realtime";

type RealtimeStatus = "connecting" | "realtime" | "polling";

type RealtimeContextValue = {
  status: RealtimeStatus;
  isRealtime: boolean;
  addListener: (listener: (event: RealtimeEvent) => void) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const eventMap: Record<string, string> = {
  "new-message": "message.created",
  "chat-list-update": "chat.updated",
  "chat-status-update": "chat.status",
  "message-status-update": "message.status",
  "contact-updated": "contact.updated",
};

export function AllSenderRealtimeProvider({ children }: { children: React.ReactNode }) {
  const auth = useAllSenderAuth();
  const listenersRef = useRef(new Set<(event: RealtimeEvent) => void>());
  const [status, setStatus] = useState<RealtimeStatus>("polling");

  useEffect(() => {
    let cancelled = false;
    let pusher: Pusher | null = null;
    let channel: ReturnType<Pusher["subscribe"]> | null = null;

    if (Platform.OS === "web" || auth.status !== "authenticated") {
      setStatus("polling");
      return () => { cancelled = true; };
    }

    setStatus("connecting");
    void getMobileRealtimeConfig().then((config) => {
      if (cancelled || !config.enabled || !config.key || !config.channel) {
        if (!cancelled) setStatus("polling");
        return;
      }

      pusher = new Pusher(config.key, { cluster: config.cluster || "us2", forceTLS: true });
      channel = pusher.subscribe(config.channel);
      channel.bind_global((name: string, data: unknown) => {
        const event: RealtimeEvent = {
          event: eventMap[name] || name,
          channel: config.channel || undefined,
          data,
        };
        listenersRef.current.forEach((listener) => listener(event));
      });
      if (!cancelled) setStatus("realtime");
    }).catch(() => {
      if (!cancelled) setStatus("polling");
    });

    return () => {
      cancelled = true;
      if (channel) {
        channel.unbind_global();
        const channelName = (channel as any).name;
        if (typeof channelName === "string") pusher?.unsubscribe(channelName);
      }
      pusher?.disconnect();
      setStatus("polling");
    };
  }, [auth.status]);

  const value = useMemo<RealtimeContextValue>(() => ({
    status,
    isRealtime: status === "realtime",
    addListener(listener) {
      listenersRef.current.add(listener);
      return () => listenersRef.current.delete(listener);
    },
  }), [status]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useAllSenderRealtime() {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error("useAllSenderRealtime debe usarse dentro de AllSenderRealtimeProvider");
  return value;
}
