import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getBootstrap, getCurrentTeam, getSessionUser } from "./api";
import { signInNative, signOutNative, signUpNative } from "./oauth";
import { clearSession, getCachedUserInfo, setCachedUserInfo } from "./session";
import type { AllSenderUserInfo, BootstrapResponse } from "./types";

export type AuthStatus = "loading" | "signed_out" | "authenticated" | "error";

type AuthContextValue = {
  status: AuthStatus;
  user: AllSenderUserInfo | null;
  bootstrap: BootstrapResponse | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AllSenderAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AllSenderUserInfo | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    setError(null);
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
      const message = cause instanceof Error ? cause.message : "No se pudo recuperar la sesión de AllSender.";
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
    setStatus("loading");
    try {
      await signInNative(email, password);
      await hydrate();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión con AllSender.");
      setStatus("signed_out");
      return false;
    }
  }, [hydrate]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    setStatus("loading");
    try {
      await signUpNative(name, email, password);
      await hydrate();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la cuenta AllSender.");
      setStatus("signed_out");
      return false;
    }
  }, [hydrate]);

  const signOut = useCallback(async () => {
    await signOutNative();
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
