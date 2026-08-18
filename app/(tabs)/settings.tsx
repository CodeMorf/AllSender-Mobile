import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { useAllSenderAuth } from "@/lib/allsender/auth-context";
import { configureNotifications, playLocalChatAlert } from "@/lib/notifications";
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences, type MobilePreferences } from "@/lib/preferences";

export default function SettingsScreen() {
  const colors = useColors();
  const { colorScheme, setColorScheme } = useThemeContext();
  const router = useRouter();
  const auth = useAllSenderAuth();
  const [preferences, setPreferences] = useState<MobilePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => { void loadPreferences().then(setPreferences); }, []);

  async function updatePreferences(next: MobilePreferences) {
    setPreferences(next);
    await savePreferences(next);
    if (next.notificationsEnabled) void configureNotifications().catch(() => undefined);
  }

  async function updateBiometric(nextValue: boolean) {
    if (!nextValue) {
      await updatePreferences({ ...preferences, biometricEnabled: false });
      return;
    }
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      Alert.alert("Disponible en el teléfono", "La huella o Face ID se activa desde Android o iOS.");
      return;
    }
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hasHardware || !isEnrolled) {
      Alert.alert("Configura la seguridad del teléfono", "Añade una huella, Face ID o un código de bloqueo en tu dispositivo e inténtalo de nuevo.");
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Proteger sesión de AllSender Mobile",
      cancelLabel: "Cancelar",
      disableDeviceFallback: false,
    });
    if (!result.success) return;
    await updatePreferences({ ...preferences, biometricEnabled: true });
  }

  function confirmLogout() {
    Alert.alert("Cerrar sesión", "Se cerrará la sesión de AllSender en este dispositivo.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: () => void auth.signOut().then(() => router.replace("/sign-in")) },
    ]);
  }

  const team = auth.user?.team;

  return (
    <ScreenContainer className="px-4 pt-2">
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <Text className="text-xs font-bold tracking-[2px] text-primary">CUENTA</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Tu AllSender</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">Tu equipo, tus alertas y tu forma de trabajar.</Text>

        <View className="mt-5 rounded-3xl bg-surface border border-border p-5">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><IconSymbol name="person.fill" size={22} color={colors.primary} /></View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-foreground">{auth.user?.name || auth.user?.email || "Usuario AllSender"}</Text>
              <Text className="mt-0.5 text-sm text-muted">{auth.user?.email}</Text>
            </View>
            <View className="rounded-full bg-success/10 px-3 py-1.5"><Text className="text-xs font-bold text-success">CONECTADO</Text></View>
          </View>
          <View className="mt-4 border-t border-border pt-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted">Equipo actual</Text>
            <Text className="mt-1 text-lg font-bold text-foreground">{team?.name || "Equipo"}</Text>
            <Text className="mt-1 text-sm text-muted">Rol: {team?.role || "member"}</Text>
            {team?.planName ? <Text className="mt-1 text-sm text-muted">Plan: {team.planName}</Text> : null}
          </View>
        </View>

        <View className="mt-4 rounded-3xl bg-surface border border-border p-5">
          <Text className="text-base font-semibold text-foreground">Alertas de mensajes</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">Controla cómo te avisa este dispositivo.</Text>
          <View className="mt-4 flex-row items-center justify-between"><View><Text className="font-medium text-foreground">Notificaciones</Text><Text className="text-xs text-muted">Permitir alertas del equipo</Text></View><Switch value={preferences.notificationsEnabled} onValueChange={(value) => void updatePreferences({ ...preferences, notificationsEnabled: value })} trackColor={{ false: colors.border, true: colors.primary }} /></View>
          <View className="mt-4 flex-row items-center justify-between"><View><Text className="font-medium text-foreground">Sonido</Text><Text className="text-xs text-muted">Reproducir sonido al recibir mensajes</Text></View><Switch value={preferences.soundEnabled} onValueChange={(value) => void updatePreferences({ ...preferences, soundEnabled: value })} trackColor={{ false: colors.border, true: colors.primary }} /></View>
          <View className="mt-4 flex-row items-center justify-between"><View><Text className="font-medium text-foreground">Vibración</Text><Text className="text-xs text-muted">Vibrar cuando corresponda</Text></View><Switch value={preferences.vibrationEnabled} onValueChange={(value) => void updatePreferences({ ...preferences, vibrationEnabled: value })} trackColor={{ false: colors.border, true: colors.primary }} /></View>
          <Pressable onPress={() => void playLocalChatAlert("AllSender Mobile", "Así sonará una alerta de chat.")} className="mt-4 items-center rounded-2xl border border-border bg-background px-4 py-3">
            <Text className="font-semibold text-primary">Probar alerta</Text>
          </Pressable>
        </View>

        <View className="mt-4 rounded-3xl bg-surface border border-border p-5">
          <Text className="text-base font-semibold text-foreground">Apariencia</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">Elige cómo quieres ver AllSender Mobile. La preferencia queda guardada en este dispositivo.</Text>
          <View className="mt-4 flex-row items-center justify-between"><View><Text className="font-medium text-foreground">Modo oscuro</Text><Text className="text-xs text-muted">Usar fondo oscuro y alto contraste</Text></View><Switch value={colorScheme === "dark"} onValueChange={(value) => setColorScheme(value ? "dark" : "light")} trackColor={{ false: colors.border, true: colors.primary }} /></View>
          <View className="mt-3 flex-row items-center"><View className="h-3 w-3 rounded-full bg-primary" /><Text className="ml-2 text-xs text-muted">Logo y colores corporativos visibles en claro y oscuro.</Text></View>
        </View>

        <View className="mt-4 rounded-3xl bg-surface border border-border p-5">
          <Text className="text-base font-semibold text-foreground">Seguridad del acceso</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">Protege el acceso a AllSender con huella, Face ID o el bloqueo del teléfono.</Text>
          <View className="mt-4 flex-row items-center justify-between"><View className="flex-1 pr-4"><Text className="font-medium text-foreground">Huella / Face ID</Text><Text className="text-xs text-muted">Se solicitará al abrir una sesión protegida.</Text></View><Switch value={preferences.biometricEnabled} onValueChange={(value) => void updateBiometric(value)} trackColor={{ false: colors.border, true: colors.primary }} /></View>
        </View>

        <View className="mt-4 rounded-3xl bg-surface border border-border p-5">
          <Text className="text-base font-semibold text-foreground">Tu privacidad</Text>
          <View className="mt-3 flex-row items-start"><IconSymbol name="lock.shield.fill" size={19} color={colors.success} /><Text className="ml-2 flex-1 text-sm leading-5 text-muted">Tu contraseña no se guarda en el teléfono. AllSender protege el acceso a tus conversaciones y a la información de tu equipo.</Text></View>
        </View>

        <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-base font-semibold text-foreground">Sincronización</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">La bandeja se actualiza automáticamente mientras la app está abierta y las notificaciones cubren el segundo plano.</Text>
          <Pressable onPress={() => void auth.refresh()} className="mt-4 items-center rounded-2xl bg-primary px-4 py-3.5"><Text className="font-bold text-white">Sincronizar ahora</Text></Pressable>
        </View>

        <Pressable onPress={confirmLogout} className="mt-4 items-center rounded-2xl border border-error/30 bg-error/5 px-4 py-4"><Text className="font-bold text-error">Cerrar sesión en este dispositivo</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
