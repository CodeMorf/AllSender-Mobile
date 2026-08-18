import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAllSenderAuth } from "@/lib/allsender/auth-context";
import { configureNotifications } from "@/lib/notifications";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const auth = useAllSenderAuth();

  useEffect(() => {
    if (auth.status === "authenticated") {
      void configureNotifications().catch(() => undefined);
    }
  }, [auth.status]);

  if (auth.status === "loading") {
    return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator color={colors.primary} /></View>;
  }
  if (auth.status !== "authenticated" || !auth.user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 58 + Math.max(insets.bottom, 8),
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Bandeja", tabBarIcon: ({ color }) => <IconSymbol size={24} name="tray.full.fill" color={color} /> }} />
      <Tabs.Screen name="manage" options={{ title: "Gestión", tabBarIcon: ({ color }) => <IconSymbol size={24} name="briefcase.fill" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Cuenta", tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.crop.circle.fill" color={color} /> }} />
    </Tabs>
  );
}
