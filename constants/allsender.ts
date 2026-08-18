export const ALLSENDER_BASE_URL = (
  process.env.EXPO_PUBLIC_ALLSENDER_BASE_URL || "https://auth.allsender.tech"
).replace(/\/$/, "");

/**
 * First-party public identifier for the AllSender Mobile app. It is safe to
 * ship a client_id in a native application. Never ship client_secret.
 */
export const ALLSENDER_CLIENT_ID = process.env.EXPO_PUBLIC_ALLSENDER_CLIENT_ID || "allsender-mobile";

/**
 * The current production backend exposes the chat-mobile API through the
 * authenticated AllSender session cookie. The mobile app performs the login
 * natively against /api/oauth/consent and keeps that HttpOnly session through
 * the native networking cookie jar.
 */
export const ALLSENDER_REDIRECT_URI =
  process.env.EXPO_PUBLIC_ALLSENDER_REDIRECT_URI || "allsender://oauth/callback";

export const ALLSENDER_SCOPES = [
  "openid",
  "profile",
  "email",
  "team",
  "offline_access",
] as const;

export const ALLSENDER_CONSENT_URL = `${ALLSENDER_BASE_URL}/api/oauth/consent`;
export const ALLSENDER_SIGN_OUT_URL = `${ALLSENDER_BASE_URL}/es/sign-out`;

export const MOBILE_SYNC_INTERVAL_MS = Math.max(
  1500,
  Number(process.env.EXPO_PUBLIC_ALLSENDER_SYNC_INTERVAL_MS || 2500),
);
