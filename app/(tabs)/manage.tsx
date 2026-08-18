import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getCrmBootstrap, getDepartments, getMobileAppShell, listMobileOrders, listMobileReservations, listMobileRestappOrders } from "@/lib/allsender/api";
import type { Department, MobileAppShell, MobileContact, MobileOrder, MobileReservation, RestappOrder } from "@/lib/allsender/types";

function iconForModule(key: string): "bubble.left.and.bubble.right.fill" | "person.2" | "briefcase.fill" | "sparkles" {
  if (key.includes("crm") || key.includes("contacts")) return "person.2";
  if (key.includes("sales") || key.includes("orders") || key.includes("products")) return "briefcase.fill";
  if (key.includes("ai")) return "sparkles";
  return "bubble.left.and.bubble.right.fill";
}

export default function ManageScreen() {
  const colors = useColors();
  const [shell, setShell] = useState<MobileAppShell | null>(null);
  const [contacts, setContacts] = useState<MobileContact[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [restappOrders, setRestappOrders] = useState<RestappOrder[]>([]);
  const [reservations, setReservations] = useState<MobileReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextShell, crm, departmentConfig] = await Promise.all([
        getMobileAppShell(),
        getCrmBootstrap().catch(() => ({ crm: null })),
        getDepartments().catch(() => ({ departments: [] })),
      ]);
      const enabledKeys = new Set((nextShell.modules || []).filter((module) => module.enabled).map((module) => module.key));
      const [nextOrders, nextRestappOrders, nextReservations] = await Promise.all([
        (enabledKeys.has("orders") || enabledKeys.has("sales-ai") ? listMobileOrders({ limit: 25 }).catch(() => []) : Promise.resolve([])),
        (enabledKeys.has("restapp") ? listMobileRestappOrders({ limit: 25 }).catch(() => []) : Promise.resolve([])),
        (enabledKeys.has("appointments") ? listMobileReservations(25).catch(() => []) : Promise.resolve([])),
      ]);
      setShell(nextShell);
      setContacts(Array.isArray(crm.crm?.contacts) ? crm.crm.contacts : []);
      setDepartments(Array.isArray(departmentConfig.departments) ? departmentConfig.departments : []);
      setOrders(nextOrders);
      setRestappOrders(nextRestappOrders);
      setReservations(nextReservations);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la gestión del equipo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counters = shell?.counters || {};
  const enabledModules = shell?.modules?.filter((module) => module.enabled) || [];

  return (
    <ScreenContainer className="px-4 pt-2">
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-xs font-bold tracking-[2px] text-primary">ALLSENDER MOBILE</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Gestión del equipo</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">Las capacidades que ves aquí dependen del equipo, tu rol y el plan activo. La app no muestra opciones que el servidor no autoriza.</Text>

        {error ? <View className="mt-4 rounded-2xl border border-error/25 bg-error/10 p-4"><Text className="font-semibold text-foreground">No pudimos actualizar</Text><Text className="mt-1 text-sm text-muted">{error}</Text><Pressable onPress={() => void load()} className="mt-3 self-start rounded-xl bg-primary px-4 py-2.5"><Text className="font-semibold text-white">Reintentar</Text></Pressable></View> : null}
        {loading ? <ActivityIndicator color={colors.primary} className="mt-10" /> : null}

        {!loading ? <>
          <View className="mt-5 flex-row gap-2">
            <View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs font-semibold text-muted">Conversaciones</Text><Text className="mt-1 text-2xl font-bold text-foreground">{counters.chats ?? 0}</Text></View>
            <View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs font-semibold text-muted">Clientes CRM</Text><Text className="mt-1 text-2xl font-bold text-foreground">{counters.contacts ?? contacts.length}</Text></View>
            <View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs font-semibold text-muted">Órdenes</Text><Text className="mt-1 text-2xl font-bold text-foreground">{counters.orders ?? 0}</Text></View>
          </View>

          <Text className="mt-7 text-lg font-bold text-foreground">Capacidades disponibles</Text>
          <View className="mt-3 gap-2">
            {enabledModules.map((module) => <View key={module.key} className="flex-row items-center rounded-2xl border border-border bg-surface px-4 py-3.5">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><IconSymbol name={iconForModule(module.key)} size={21} color={colors.primary} /></View>
              <View className="ml-3 flex-1"><Text className="font-semibold text-foreground">{module.label}</Text><Text className="text-xs text-muted">{module.group} · Disponible para este equipo</Text></View>
              <View className="h-2.5 w-2.5 rounded-full bg-success" />
            </View>)}
            {!enabledModules.length ? <Text className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">No hay capacidades adicionales habilitadas para este equipo.</Text> : null}
          </View>

          {orders.length ? <>
            <Text className="mt-7 text-lg font-bold text-foreground">Órdenes de Ventas IA</Text>
            <View className="mt-3 gap-2">
              {orders.slice(0, 8).map((order) => <View key={order.id} className="rounded-2xl border border-border bg-surface p-4">
                <View className="flex-row items-center justify-between"><Text className="font-semibold text-foreground">{order.order_number || `Orden #${order.id}`}</Text><Text className="text-xs font-semibold text-primary">{order.status || "pendiente"}</Text></View>
                <Text className="mt-1 text-sm text-muted">{order.customer_name || "Cliente"} · {order.customer_phone || "Sin teléfono"}</Text>
                <Text className="mt-1 text-sm font-semibold text-foreground">{order.total ?? 0} · {order.payment_status || "pago pendiente"}</Text>
              </View>)}
            </View>
          </> : null}

          {restappOrders.length ? <>
            <Text className="mt-7 text-lg font-bold text-foreground">Pedidos del restaurante</Text>
            <View className="mt-3 gap-2">
              {restappOrders.slice(0, 8).map((order) => <View key={order.id} className="rounded-2xl border border-border bg-surface p-4">
                <View className="flex-row items-center justify-between"><Text className="font-semibold text-foreground">{order.order_number || `Pedido #${order.id}`}</Text><Text className="text-xs font-semibold text-primary">{order.status || "confirmado"}</Text></View>
                <Text className="mt-1 text-sm text-muted">{order.customer_name || "Cliente"} · {order.customer_phone || "Sin teléfono"}</Text>
                <Text className="mt-1 text-sm font-semibold text-foreground">{order.total ?? 0} {order.currency || ""}</Text>
              </View>)}
            </View>
          </> : null}

          {reservations.length ? <>
            <Text className="mt-7 text-lg font-bold text-foreground">Calendario y reservas</Text>
            <View className="mt-3 gap-2">
              {reservations.slice(0, 8).map((reservation) => <View key={reservation.id} className="rounded-2xl border border-border bg-surface p-4">
                <View className="flex-row items-center justify-between"><Text className="font-semibold text-foreground">{reservation.customerName || "Cliente"}</Text><Text className="text-xs font-semibold text-primary">{reservation.status || "pendiente"}</Text></View>
                <Text className="mt-1 text-sm text-muted">{reservation.serviceName || "Reserva"} · {reservation.partySize || 1} personas</Text>
                <Text className="mt-1 text-sm text-muted">{reservation.startAt || reservation.reservedAt || "Fecha pendiente"}</Text>
              </View>)}
            </View>
          </> : null}

          <Text className="mt-7 text-lg font-bold text-foreground">Canales conectados</Text>
          <View className="mt-3 rounded-2xl border border-border bg-surface p-4">
            {shell?.socialAccounts?.length ? shell.socialAccounts.map((account) => (
              <View key={`${account.platform}-${account.name}`} className="mb-3 flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10"><IconSymbol name="bubble.left.and.bubble.right.fill" size={17} color={colors.primary} /></View>
                <View className="ml-3 flex-1"><Text className="font-semibold text-foreground">{account.name}</Text><Text className="text-xs text-muted">{account.platform} · {account.status === "connected" ? "Conectado" : "Pendiente"}</Text></View>
                <View className={`h-2.5 w-2.5 rounded-full ${account.status === "connected" ? "bg-success" : "bg-warning"}`} />
              </View>
            )) : <Text className="text-sm text-muted">No hay canales conectados o tu rol no puede verlos.</Text>}
          </View>

          <Text className="mt-7 text-lg font-bold text-foreground">Departamentos</Text>
          <View className="mt-3 rounded-2xl border border-border bg-surface p-4">
            {departments.length ? departments.map((department) => <View key={String(department.id || department.code || department.name)} className="mb-3 flex-row items-center"><View className="h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><IconSymbol name="person.2" size={17} color={colors.primary} /></View><View className="ml-3"><Text className="font-semibold text-foreground">{department.name}</Text><Text className="text-xs text-muted">{department.memberUserIds?.length || 0} miembros</Text></View></View>) : <Text className="text-sm text-muted">No hay departamentos configurados o tu rol no puede verlos.</Text>}
          </View>

          <Text className="mt-7 text-lg font-bold text-foreground">Clientes recientes</Text>
          <View className="mt-3 rounded-2xl border border-border bg-surface p-4">
            {contacts.slice(0, 8).map((item) => <View key={item.id} className="mb-3 flex-row items-center"><View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10"><Text className="font-bold text-primary">{item.name.slice(0, 1).toUpperCase()}</Text></View><View className="ml-3 flex-1"><Text className="font-semibold text-foreground" numberOfLines={1}>{item.name}</Text><Text className="text-xs text-muted">{item.phone || "Sin teléfono"}{item.assignedUser?.name ? ` · ${item.assignedUser.name}` : ""}</Text></View></View>)}
            {!contacts.length ? <Text className="text-sm text-muted">Aún no hay clientes guardados en CRM.</Text> : null}
          </View>
        </> : null}
      </ScrollView>
    </ScreenContainer>
  );
}
