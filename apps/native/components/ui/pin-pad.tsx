import { cn } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { haptic, SPRING } from "@/lib/motion";

import { Banner } from "./card";
import { Keypad, type KeypadKey } from "./keypad";

const PIN_LENGTH = 4;

function Dot({ filled, error }: { filled: boolean; error: boolean }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (filled) scale.value = withSequence(withTiming(1.35, { duration: 90 }), withSpring(1, SPRING));
  }, [filled, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={style}
      className={cn(
        "w-3.5 h-3.5 rounded-full",
        error ? "bg-alarm" : filled ? "bg-ink" : "bg-transparent border-2 border-line-strong",
      )}
    />
  );
}

type Props = {
  /** Return false (or an error message) to shake and clear; anything else keeps the dots. */
  onComplete: (pin: string) => Promise<boolean | string> | boolean | string;
  /** Message shown above the dots, e.g. "Wrong PIN, 3 tries left". */
  error?: string | null;
  disabled?: boolean;
};

/** Four dots and a number pad. Fills with a pop; a wrong PIN shakes the dots. */
export function PinPad({ onComplete, error, disabled }: Props) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const shown = message ?? error ?? null;

  async function submit(full: string) {
    setBusy(true);
    const result = await onComplete(full);
    setBusy(false);
    if (result === true) return;
    haptic.error();
    setMessage(typeof result === "string" ? result : "Wrong PIN");
    shake.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
    setTimeout(() => setPin(""), 260);
  }

  function onKey(key: KeypadKey) {
    if (busy) return;
    if (key === "back") {
      setPin((current) => current.slice(0, -1));
      return;
    }
    if (key === "." || pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setMessage(null);
    setPin(next);
    if (next.length === PIN_LENGTH) void submit(next);
  }

  return (
    <View className="gap-6">
      <View className="items-center gap-4 min-h-[60px] justify-end">
        {shown ? <Banner tone="danger" icon="error" text={shown} /> : null}
        <Animated.View style={shakeStyle} className="flex-row gap-4">
          {Array.from({ length: PIN_LENGTH }, (_, index) => (
            <Dot key={index} filled={index < pin.length} error={Boolean(shown) && pin.length === PIN_LENGTH} />
          ))}
        </Animated.View>
      </View>
      <Keypad onKey={onKey} disabled={disabled || busy} />
    </View>
  );
}
