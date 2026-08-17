import { createContext, useContext, useMemo } from "react";

import type { RealtimeEvent } from "./realtime";

type RealtimeContextValue = {
  status: "polling";
  isRealtime: false;
  addListener: (listener: (event: RealtimeEvent) => void) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Production auth.allsender.tech currently exposes the real chat-mobile API
 * through the session cookie but does not publish a Pusher auth endpoint.
 * We keep a single context so the UI can upgrade to server-push later without
 * changing screen code; today foreground freshness is provided by useLiveSync.
 */
export function AllSenderRealtimeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<RealtimeContextValue>(() => ({
    status: "polling",
    isRealtime: false,
    addListener() {
      return () => undefined;
    },
  }), []);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useAllSenderRealtime() {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error("useAllSenderRealtime debe usarse dentro de AllSenderRealtimeProvider");
  return value;
}
