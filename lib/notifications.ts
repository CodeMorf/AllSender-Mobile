import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform, Vibration } from "react-native";

import { registerDevice } from "./allsender/api";
import { secureGet, secureSet } from "./allsender/storage";

import { loadPreferences } from "./preferences";

const DEVICE_KEY = "device.id";
const CHAT_CHANNEL_PREFIX = "chat-alerts";
const DEFAULT_REMOTE_CHANNEL_ID = "allsender-default";
const VIBRATION_PATTERN = [0, 250, 180, 250];
const recentMessageAlerts = new Map<string, number>();
const ALERT_DEDUPE_MS = 90_000;

function pruneAlertDedupe(now = Date.now()) {
  for (const [id, seenAt] of recentMessageAlerts) {
    if (now - seenAt > ALERT_DEDUPE_MS) recentMessageAlerts.delete(id);
  }
}

function messageIdFromData(data: Record<string, unknown> | undefined | null) {
  const value = data?.messageId ?? data?.message_id;
  return value == null ? "" : String(value);
}

function rememberAlert(messageId: string) {
  if (!messageId) return;
  pruneAlertDedupe();
  recentMessageAlerts.set(messageId, Date.now());
}

function wasAlerted(messageId: string) {
  if (!messageId) return false;
  pruneAlertDedupe();
  return recentMessageAlerts.has(messageId);
}

function chatChannelId(soundEnabled: boolean, vibrationEnabled: boolean) {
  if (soundEnabled && vibrationEnabled) return `${CHAT_CHANNEL_PREFIX}-sound-vibrate`;
  if (soundEnabled) return `${CHAT_CHANNEL_PREFIX}-sound`;
  if (vibrationEnabled) return `${CHAT_CHANNEL_PREFIX}-vibrate`;
  return `${CHAT_CHANNEL_PREFIX}-silent`;
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const preferences = await loadPreferences();
    const data = (notification.request.content.data || {}) as Record<string, unknown>;
    const isLocalAllSenderAlert = data.__allsender_local === true;
    const messageId = messageIdFromData(data);

    // The same message can be detected by foreground sync and also arrive by push.
    // Keep exactly one user-facing alert while still allowing our local alert.
    if (!isLocalAllSenderAlert && messageId) {
      if (wasAlerted(messageId)) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
      rememberAlert(messageId);
    }

    return {
      shouldShowAlert: preferences.notificationsEnabled,
      shouldPlaySound: preferences.notificationsEnabled && preferences.soundEnabled,
      shouldSetBadge: preferences.notificationsEnabled,
      shouldShowBanner: preferences.notificationsEnabled,
      shouldShowList: preferences.notificationsEnabled,
    };
  },
});

export async function getStableDeviceId() {
  const current = await secureGet(DEVICE_KEY);
  if (current) return current;
  const next = `as-mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 16)}`;
  await secureSet(DEVICE_KEY, next);
  return next;
}

export async function configureNotifications() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  const preferences = await loadPreferences();
  if (!preferences.notificationsEnabled) return null;

  const channelId = chatChannelId(preferences.soundEnabled, preferences.vibrationEnabled);
  if (Platform.OS === "android") {
    // The backend uses this stable channel for remote Expo pushes.
    await Notifications.setNotificationChannelAsync(DEFAULT_REMOTE_CHANNEL_ID, {
      name: "Mensajes de AllSender",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: preferences.vibrationEnabled ? VIBRATION_PATTERN : [0],
      sound: preferences.soundEnabled ? "default" : undefined,
      lightColor: "#0B6477",
    });
    await Notifications.setNotificationChannelAsync(channelId, {
      name: "Mensajes de AllSender",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: preferences.vibrationEnabled ? VIBRATION_PATTERN : [0],
      sound: preferences.soundEnabled ? "default" : undefined,
      lightColor: "#0B6477",
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return null;

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  const deviceId = await getStableDeviceId();
  await registerDevice({
    deviceId,
    platform: Platform.OS === "ios" ? "ios" : "android",
    pushToken: pushToken.data,
    appVersion: Constants.expoConfig?.version || null,
    deviceName: null,
    soundEnabled: preferences.soundEnabled,
    vibrationEnabled: preferences.vibrationEnabled,
  });
  return pushToken.data;
}

export async function playLocalChatAlert(title: string, body: string, data?: Record<string, string | number>) {
  const preferences = await loadPreferences();
  if (!preferences.notificationsEnabled) return;
  const messageId = messageIdFromData(data);
  if (messageId && wasAlerted(messageId)) return;
  if (messageId) rememberAlert(messageId);
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: preferences.soundEnabled ? "default" : undefined,
      ...(Platform.OS === "android"
        ? {
            channelId: chatChannelId(preferences.soundEnabled, preferences.vibrationEnabled),
            vibrationPattern: preferences.vibrationEnabled ? VIBRATION_PATTERN : [0],
          }
        : {}),
      data: { ...(data || {}), __allsender_local: true },
    },
    trigger: null,
  });
  if (preferences.vibrationEnabled && (Platform.OS === "android" || Platform.OS === "ios")) {
    Vibration.vibrate(VIBRATION_PATTERN);
  }
}
