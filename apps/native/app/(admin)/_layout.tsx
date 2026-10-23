import { Redirect, Stack } from "expo-router";

import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

/**
 * Coline-only pages (reports, people, phones, settings, move money...).
 * The URLs stay the same; a helper who reaches one sees "No access".
 */
export default function AdminLayout() {
  const session = useObservable(sessionStore);
  if (!session) return <Redirect href="/lock" />;
  if (session.user.role !== "OWNER") return <Redirect href="/no-access" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F4F3EF" },
        animation: "slide_from_right",
        animationDuration: 260,
      }}
    >
      <Stack.Screen name="move-money" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}
