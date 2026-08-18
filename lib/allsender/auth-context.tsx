import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

import { getBootstrap, getCurrentTeam, getSessionUser } from "./api";
import { signInNative, signOutNative, signUpNative } from "./oauth";
import { clearSession, getCachedUserInfo, setCachedUserInfo } from "./session";
import { loadPreferences } from "../preferences";
import type { AllSenderUserInfo, BootstrapResponse } from "./types";

export type AuthStatus = "loading" | "signed_out" | "authenticated" | "error";

type AuthContextValue = {
  status: AuthStatus;
  user: AllSenderUserInfo | null;
  bootstrap: BootstrapResponse | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(cause: unknown) {
  const raw = cause instanceof Error ? cause.message : String(cause || "");
  if (/failed to fetch|network request failed|load failed/i.test(raw)) {
    return "No pudimos conectar con AllSender. Comprueba tu conexión e inténtalo de nuevo.";
  }
  if (/client_id|configuración pendiente/i.test(raw)) {
    return "El acceso móvil aún no está disponible para este entorno.";
  }
  return raw || "No se pudo completar el acceso. Inténtalo de nuevo.";
}

export function AllSenderAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AllSenderUserInfo | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const biometricCheckedRef = useRef(false);

  const hydrate = useCallback(async () => {
    setError(null);
    // The published contract is a native HttpOnly-cookie flow. A browser
    // preview cannot reuse that native cookie jar and would only produce a
    // misleading CORS/Failed to fetch error, so keep the preview signed out.
    if (Platform.OS === "web") {
      setUser(null);
      setBootstrap(null);
      setStatus("signed_out");
      return;
    }
    const cached = await getCachedUserInfo();
    if (cached) setUser(cached);

    try {
      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        await clearSession();
        setUser(null);
        setBootstrap(null);
        setStatus("signed_out");
        return;
      }

      const [team, boot] = await Promise.all([
        getCurrentTeam(),
        getBootstrap().catch(() => null),
      ]);

      const normalized: AllSenderUserInfo = {
        sub: String(sessionUser.id),
        id: sessionUser.id,
        name: sessionUser.name || sessionUser.email || "Usuario AllSender",
        email: sessionUser.email || null,
        role: sessionUser.role || null,
        team: {
          id: Number(team.id),
          name: team.name || "Equipo",
          role: String(team.myRole || sessionUser.role || "member"),
          planId: team.planId || null,
          planName: team.planName || team.plan?.name || null,
          canManageTeam: Boolean(team.canManageTeam),
        },
      };

      if (!biometricCheckedRef.current && (Platform.OS === "ios" || Platform.OS === "android")) {
        const preferences = await loadPreferences();
        if (preferences.biometricEnabled) {
          const [hasHardware, isEnrolled] = await Promise.all([
            LocalAuthentication.hasHardwareAsync(),
            LocalAuthentication.isEnrolledAsync(),
          ]);
          if (hasHardware && isEnrolled) {
            const biometricResult = await LocalAuthentication.authenticateAsync({
              promptMessage: "Confirmar acceso a AllSender Mobile",
              cancelLabel: "Cancelar",
              disableDeviceFallback: false,
            });
            if (!biometricResult.success) {
              setError("Confirma tu identidad con huella, Face ID o el bloqueo del teléfono para continuar.");
              setStatus("signed_out");
              return;
            }
          }
        }
        biometricCheckedRef.current = true;
      }

      await setCachedUserInfo(normalized);
      setUser(normalized);
      setBootstrap(boot || {
        ok: true,
        user: { id: sessionUser.id, name: sessionUser.name, email: sessionUser.email, role: sessionUser.role },
        team: {
          id: Number(team.id),
          name: team.name || "Equipo",
          planId: team.planId || null,
          planName: team.planName || team.plan?.name || null,
          role: String(team.myRole || sessionUser.role || "member"),
        },
      });
      setStatus("authenticated");
    } catch (cause) {
      const message = friendlyAuthError(cause);
      setError(message);
      setStatus(cached ? "error" : "signed_out");
      if (!cached) {
        setUser(null);
        setBootstrap(null);
      }
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    if (Platform.OS === "web") {
      setError("El acceso de AllSender Mobile se prueba en Android o iOS, no en la vista web.");
      setStatus("signed_out");
      return false;
    }
    setStatus("loading");
    try {
      await signInNative(email, password);
      await hydrate();
      return true;
    } catch (cause) {
      setError(friendlyAuthError(cause));
      setStatus("signed_out");
      return false;
    }
  }, [hydrate]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    if (Platform.OS === "web") {
      setError("El registro de AllSender Mobile se prueba en Android o iOS, no en la vista web.");
      setStatus("signed_out");
      return false;
    }
    setStatus("loading");
    try {
      await signUpNative(name, email, password);
      await hydrate();
      return true;
    } catch (cause) {
      setError(friendlyAuthError(cause));
      setStatus("signed_out");
      return false;
    }
  }, [hydrate]);

  const unlockWithBiometrics = useCallback(async () => {
    setError(null);
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      setError("La huella o Face ID solo está disponible en Android o iOS.");
      setStatus("signed_out");
      return false;
    }

    const cached = await getCachedUserInfo();
    if (!cached) {
      setError("Inicia sesión con tu correo y contraseña para activar la huella.");
      setStatus("signed_out");
      return false;
    }

    let hasHardware = false;
    let isEnrolled = false;
    try {
      [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
    } catch {
      setError("No pudimos comprobar la seguridad del teléfono. Usa tu contraseña para entrar.");
      setStatus("signed_out");
      return false;
    }
    if (!hasHardware || !isEnrolled) {
      setError("Configura la huella, Face ID o el bloqueo del teléfono e inténtalo de nuevo.");
      setStatus("signed_out");
      return false;
    }

    let biometricResult: LocalAuthentication.LocalAuthenticationResult;
    try {
      biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirmar acceso a AllSender Mobile",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });
    } catch {
      setError("No pudimos abrir la huella o Face ID. Usa tu contraseña para entrar.");
      setStatus("signed_out");
      return false;
    }
    if (!biometricResult.success) {
      setError("No se confirmó la identidad. Puedes intentarlo de nuevo o usar tu contraseña.");
      setStatus("signed_out");
      return false;
    }

    // The session cookie is still the source of authorization. The biometric
    // only unlocks the cached session; hydrate verifies that cookie again.
    biometricCheckedRef.current = true;
    await hydrate();
    return true;
  }, [hydrate]);

  const signOut = useCallback(async () => {
    await signOutNative();
    biometricCheckedRef.current = false;
    setUser(null);
    setBootstrap(null);
    setError(null);
    setStatus("signed_out");
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    bootstrap,
    error,
    signIn,
    signUp,
    unlockWithBiometrics,
    signOut,
    refresh: hydrate,
  }), [bootstrap, error, hydrate, signIn, signOut, signUp, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAllSenderAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAllSenderAuth debe usarse dentro de AllSenderAuthProvider");
  return value;
}
