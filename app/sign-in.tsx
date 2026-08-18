import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ALLSENDER_CLIENT_ID } from "@/constants/allsender";
import { useColors } from "@/hooks/use-colors";
import { useAllSenderAuth } from "@/lib/allsender/auth-context";

type Mode = "login" | "signup";

export default function SignInScreen() {
  const colors = useColors();
  const router = useRouter();
  const auth = useAllSenderAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);

  async function submit() {
    const cleanEmail = email.trim();
    if (!cleanEmail || password.length < 8 || (mode === "signup" && name.trim().length < 2)) return;
    setWorking(true);
    const ok = mode === "login"
      ? await auth.signIn(cleanEmail, password)
      : await auth.signUp(name, cleanEmail, password);
    setWorking(false);
    if (ok) {
      setPassword("");
      router.replace("/(tabs)");
    }
  }

  const disabled =
    working ||
    !ALLSENDER_CLIENT_ID ||
    !email.trim() ||
    password.length < 8 ||
    (mode === "signup" && name.trim().length < 2);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="pt-8">
            <View className="self-start rounded-3xl bg-surface border border-border p-3 shadow-sm">
              <Image source={require("../assets/images/icon.png")} style={{ width: 56, height: 56 }} contentFit="contain" />
            </View>
            <Text className="mt-7 text-xs font-bold tracking-[2.5px] text-primary">ALLSENDER MOBILE</Text>
            <Text className="mt-2 text-4xl font-bold leading-[45px] text-foreground">Todo tu equipo en una sola bandeja.</Text>
            <Text className="mt-3 text-base leading-6 text-muted">
              Acceso nativo para propietarios, administradores y agentes. Tus canales y permisos permanecen controlados por AllSender.
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-2">
              {["Chat", "CRM", "Equipos", "Tiempo real"].map((label) => (
                <View key={label} className="rounded-full border border-border bg-surface px-3 py-1.5">
                  <Text className="text-xs font-semibold text-muted">{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-7 rounded-[28px] border border-border bg-surface p-5">
            <View className="flex-row rounded-2xl bg-background p-1">
              <Pressable onPress={() => setMode("login")} className={`flex-1 items-center rounded-xl py-2.5 ${mode === "login" ? "bg-primary" : ""}`}>
                <Text className={`font-semibold ${mode === "login" ? "text-white" : "text-muted"}`}>Iniciar sesión</Text>
              </Pressable>
              <Pressable onPress={() => setMode("signup")} className={`flex-1 items-center rounded-xl py-2.5 ${mode === "signup" ? "bg-primary" : ""}`}>
                <Text className={`font-semibold ${mode === "signup" ? "text-white" : "text-muted"}`}>Crear cuenta</Text>
              </Pressable>
            </View>

            {mode === "signup" ? (
              <View className="mt-5">
                <Text className="mb-2 text-sm font-semibold text-foreground">Nombre</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  placeholder="Tu nombre"
                  placeholderTextColor={colors.muted}
                  className="rounded-2xl border border-border bg-background px-4 py-3.5 text-foreground"
                />
              </View>
            ) : null}

            <View className="mt-5">
              <Text className="mb-2 text-sm font-semibold text-foreground">Correo AllSender</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="usuario@empresa.com"
                placeholderTextColor={colors.muted}
                className="rounded-2xl border border-border bg-background px-4 py-3.5 text-foreground"
              />
            </View>

            <View className="mt-4">
              <Text className="mb-2 text-sm font-semibold text-foreground">Contraseña</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                textContentType={mode === "login" ? "password" : "newPassword"}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={colors.muted}
                className="rounded-2xl border border-border bg-background px-4 py-3.5 text-foreground"
                onSubmitEditing={() => void submit()}
              />
            </View>

            {auth.error ? (
              <View className="mt-4 rounded-2xl border border-error/30 bg-error/10 p-3.5">
                <Text className="text-sm leading-5 text-error">{auth.error}</Text>
              </View>
            ) : null}

            {!ALLSENDER_CLIENT_ID ? (
              <View className="mt-4 rounded-2xl border border-warning/40 bg-warning/10 p-3.5">
                <Text className="font-semibold text-foreground">Acceso en preparación</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">
                  El administrador aún debe activar AllSender Mobile para este equipo. Después podrás entrar con tu cuenta habitual.
                </Text>
              </View>
            ) : null}

            <Pressable
              disabled={disabled}
              onPress={() => void submit()}
              style={({ pressed }) => [{ opacity: pressed || disabled ? 0.55 : 1 }]}
              className="mt-5 h-14 flex-row items-center justify-center rounded-2xl bg-primary px-5"
            >
              {working ? <ActivityIndicator color={colors.foreground} /> : <IconSymbol name="lock.shield.fill" size={20} color={colors.foreground} />}
              <Text className="ml-2 text-base font-bold text-white">
                {mode === "login" ? "Entrar a AllSender" : "Crear mi cuenta"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-5 flex-row items-start rounded-2xl bg-primary/5 px-4 py-3.5">
            <IconSymbol name="checkmark.shield.fill" size={19} color={colors.primary} />
            <Text className="ml-2 flex-1 text-xs leading-5 text-muted">
              Tus datos se mantienen protegidos y se usan únicamente para iniciar tu sesión.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
