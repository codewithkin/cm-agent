import { Stack } from "expo-router";

/** Every hand-over: A4 who is serving → A5 PIN → (A6 set PIN). */
export default function LockLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F4F3EF" },
        animation: "slide_from_right",
        animationDuration: 240,
      }}
    />
  );
}
