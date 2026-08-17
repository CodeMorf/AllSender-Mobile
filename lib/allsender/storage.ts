import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PREFIX = "allsender.mobile.";

export async function secureGet(key: string): Promise<string | null> {
  const full = `${PREFIX}${key}`;
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(full);
  }
  return SecureStore.getItemAsync(full);
}

export async function secureSet(key: string, value: string): Promise<void> {
  const full = `${PREFIX}${key}`;
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.setItem(full, value);
    return;
  }
  await SecureStore.setItemAsync(full, value);
}

export async function secureDelete(key: string): Promise<void> {
  const full = `${PREFIX}${key}`;
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.removeItem(full);
    return;
  }
  await SecureStore.deleteItemAsync(full);
}
