import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { loadDevice } from "@/lib/device";
import { APP_FONTS } from "@/lib/fonts";
import { bumpIdleTimer, watchIdle } from "@/lib/idle-lock";
import { loadLocalDb } from "@/lib/local-db";
import { watchNetwork } from "@/lib/network";
import { loadOutbox } from "@/lib/outbox";
import { loadSyncState, startSyncLoop, syncNow } from "@/lib/sync";
import { queryClient } from "@/utils/trpc";

void SplashScreen.preventAutoHideAsync();

/** Loads the phone's saved state, then keeps it in sync while the app is open. */
function useAppStartup() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void Promise.all([loadDevice(), loadLocalDb(), loadOutbox(), loadSyncState()]).then(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready) return;
    const stopNetwork = watchNetwork((online) => {
      if (online) void syncNow();
    });
    const stopSync = startSyncLoop();
    const stopIdle = watchIdle();
    return () => {
      stopNetwork();
      stopSync();
      stopIdle();
    };
  }, [ready]);
  return ready;
}

function RootStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F4F3EF" },
        animation: "slide_from_right",
        animationDuration: 260,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen name="setup" options={{ animation: "fade" }} />
      <Stack.Screen name="lock" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="(booth)" options={{ animation: "fade" }} />
      <Stack.Screen name="(owner)" options={{ animation: "fade" }} />
      {/* Flows that finish something slide up as full-screen modals. */}
      <Stack.Screen name="transaction/new" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="transaction/saved" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="shift/start" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="shift/end" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="owner-pin" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="(admin)" />
      <Stack.Screen
        name="incoming-sms"
        options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }}
      />
    </Stack>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts(APP_FONTS);
  const ready = useAppStartup();

  useEffect(() => {
    if (fontsLoaded && ready) void SplashScreen.hideAsync();
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <HeroUINativeProvider>
            <StatusBar style="dark" />
            {/* Any touch restarts the 2-minute idle lock. */}
            <View
              style={{ flex: 1 }}
              onStartShouldSetResponderCapture={() => {
                bumpIdleTimer();
                return false;
              }}
            >
              <RootStack />
            </View>
          </HeroUINativeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
