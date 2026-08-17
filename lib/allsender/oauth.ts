import {
  ALLSENDER_BASE_URL,
  ALLSENDER_CLIENT_ID,
  ALLSENDER_CONSENT_URL,
  ALLSENDER_REDIRECT_URI,
  ALLSENDER_SCOPES,
  ALLSENDER_SIGN_OUT_URL,
} from "@/constants/allsender";
import { clearSession, setSessionHint } from "./session";

export type NativeLoginResult = {
  ok: boolean;
  redirectTo?: string | null;
};

function assertConfigured() {
  if (!ALLSENDER_CLIENT_ID) {
    throw new Error(
      "Falta EXPO_PUBLIC_ALLSENDER_CLIENT_ID. Usa el client_id real registrado para AllSender Mobile.",
    );
  }
}

function requestState() {
  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

async function consentRequest(payload: Record<string, unknown>): Promise<NativeLoginResult> {
  assertConfigured();

  const response = await fetch(ALLSENDER_CONSENT_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      client_id: ALLSENDER_CLIENT_ID,
      redirect_uri: ALLSENDER_REDIRECT_URI,
      scope: ALLSENDER_SCOPES.join(" "),
      state: requestState(),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) {
    const map: Record<string, string> = {
      invalid_credentials: "Correo o contraseña incorrectos.",
      email_password_required: "Escribe tu correo y contraseña.",
      invalid_signup: "Completa nombre, correo y una contraseña de mínimo 8 caracteres.",
      email_taken: "Ese correo ya está registrado. Inicia sesión.",
      invalid_client: "El client_id móvil no está registrado en AllSender.",
      invalid_redirect_uri: "El callback móvil no está registrado exactamente en AllSender.",
      no_team: "Tu usuario no tiene un equipo AllSender activo.",
    };
    throw new Error(map[String(data?.error || "")] || data?.error || `AllSender HTTP ${response.status}`);
  }

  // /api/oauth/consent creates the real HttpOnly AllSender session cookie.
  // The native networking cookie jar reuses it on credentials:'include'.
  await setSessionHint(true);
  return { ok: true, redirectTo: data.redirect_to || null };
}

export async function signInNative(email: string, password: string) {
  return consentRequest({ action: "login", email: email.trim().toLowerCase(), password });
}

export async function signUpNative(name: string, email: string, password: string) {
  return consentRequest({ action: "signup", name: name.trim(), email: email.trim().toLowerCase(), password });
}

export async function signOutNative(): Promise<void> {
  try {
    await fetch(ALLSENDER_SIGN_OUT_URL, {
      method: "GET",
      credentials: "include",
      redirect: "follow",
      headers: { Accept: "text/html,application/json" },
    });
  } catch {
    // The next hydrate still verifies the session with /api/user.
  } finally {
    await clearSession();
  }
}

export function getAuthDiagnostics() {
  return {
    baseUrl: ALLSENDER_BASE_URL,
    hasClientId: Boolean(ALLSENDER_CLIENT_ID),
    redirectUri: ALLSENDER_REDIRECT_URI,
    transport: "native-session-cookie" as const,
  };
}
