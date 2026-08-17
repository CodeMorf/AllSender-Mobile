import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Resilient foreground sync while the production realtime endpoint is being
 * enabled. This deliberately does not pretend to be server-push realtime.
 */
export function useLiveSync(callback: () => Promise<void>, intervalMs: number, enabled = true) {
  const callbackRef = useRef(callback);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => { callbackRef.current = callback; }, [callback]);

  const run = useCallback(async () => {
    if (!enabled || appState !== "active") return;
    await callbackRef.current().catch(() => undefined);
  }, [appState, enabled]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", setAppState);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled || appState !== "active") return;
    const id = setInterval(() => void run(), intervalMs);
    return () => clearInterval(id);
  }, [appState, enabled, intervalMs, run]);

  return { appState, syncNow: run };
}
