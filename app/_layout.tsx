import "@/global.css";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { NotificationRouter } from "@/components/notification-router";
import { AllSenderAuthProvider } from "@/lib/allsender/auth-context";
import { AllSenderRealtimeProvider } from "@/lib/allsender/realtime-context";
import { ThemeProvider } from "@/lib/theme-provider";

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: 1 },
      mutations: { retry: 0 },
    },
  }));

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <AllSenderAuthProvider>
              <AllSenderRealtimeProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="sign-in" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="chat/[jid]" />
                </Stack>
                <NotificationRouter />
                <StatusBar style="auto" />
              </AllSenderRealtimeProvider>
            </AllSenderAuthProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
