import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "allsender.mobile.preferences.v1";

export type MobilePreferences = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
};

export const DEFAULT_PREFERENCES: MobilePreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
  notificationsEnabled: true,
  biometricEnabled: false,
};

export async function loadPreferences(): Promise<MobilePreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(value: MobilePreferences) {
  await AsyncStorage.setItem(KEY, JSON.stringify(value));
}
