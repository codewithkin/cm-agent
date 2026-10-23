import { Stack } from "expo-router";

/** First launch, done once per phone by Coline: A1 → A2 → A3. */
export default function SetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F4F3EF" },
        animation: "slide_from_right",
        animationDuration: 260,
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
    </Stack>
  );
}
