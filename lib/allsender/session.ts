import type { AllSenderUserInfo } from "./types";
import { secureDelete, secureGet, secureSet } from "./storage";

const USER_KEY = "session.user";
const HINT_KEY = "session.active";

export async function getCachedUserInfo(): Promise<AllSenderUserInfo | null> {
  const raw = await secureGet(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AllSenderUserInfo;
  } catch {
    await secureDelete(USER_KEY);
    return null;
  }
}

export async function setCachedUserInfo(user: AllSenderUserInfo | null): Promise<void> {
  if (!user) {
    await secureDelete(USER_KEY);
    return;
  }
  await secureSet(USER_KEY, JSON.stringify(user));
}

export async function setSessionHint(active: boolean): Promise<void> {
  if (!active) {
    await secureDelete(HINT_KEY);
    return;
  }
  await secureSet(HINT_KEY, "1");
}

export async function hasSessionHint(): Promise<boolean> {
  return (await secureGet(HINT_KEY)) === "1";
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    secureDelete(USER_KEY),
    secureDelete(HINT_KEY),
  ]);
}
