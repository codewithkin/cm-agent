import { useMemo, useRef, useState } from "react";
import { PanResponder, View, type LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { enterFade, exitFade, haptic } from "@/lib/motion";

import { Icon } from "./icon";
import { Tap } from "./tap";
import { T } from "./text";

/** The strokes as a small SVG data URL, stored as the transaction's signature. */
export function signatureToDataUrl(strokes: string[], width: number, height: number): string {
  const paths = strokes
    .map((d) => `<path d="${d}" fill="none" stroke="#141416" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(width)} ${Math.round(height)}">${paths}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type Props = {
  /** Called with the signature, or null once cleared. */
  onChange: (signature: string | null) => void;
  height?: number;
};

/** "Customer signs here": draw with a finger; Clear starts again. */
export function SignaturePad({ onChange, height = 260 }: Props) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const size = useRef({ width: 0, height });
  const currentRef = useRef<string | null>(null);
  const strokesRef = useRef<string[]>([]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          currentRef.current = `M${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          setCurrent(currentRef.current);
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          currentRef.current = `${currentRef.current ?? ""} L${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          setCurrent(currentRef.current);
        },
        onPanResponderRelease: () => {
          if (!currentRef.current) return;
          const isFirst = strokesRef.current.length === 0;
          strokesRef.current = [...strokesRef.current, currentRef.current];
          currentRef.current = null;
          setStrokes(strokesRef.current);
          setCurrent(null);
          if (isFirst) haptic.select();
          onChange(signatureToDataUrl(strokesRef.current, size.current.width, size.current.height));
        },
      }),
    [onChange],
  );

  function clear() {
    strokesRef.current = [];
    setStrokes([]);
    onChange(null);
  }

  const empty = strokes.length === 0 && !current;

  return (
    <View
      className="bg-white rounded-3xl border border-line overflow-hidden"
      style={{ height }}
      onLayout={(event: LayoutChangeEvent) => {
        size.current = event.nativeEvent.layout;
      }}
    >
      <View className="absolute inset-0" {...responder.panHandlers}>
        <Svg width="100%" height="100%">
          {strokes.map((d, index) => (
            <Path key={index} d={d} stroke="#141416" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
          {current ? (
            <Path d={current} stroke="#141416" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ) : null}
        </Svg>
      </View>

      <View pointerEvents="none" className="absolute left-5 right-5 bottom-12 flex-row items-end gap-2">
        <Icon name="close" size={18} className="text-subtle" />
        <View className="flex-1 border-b border-line-strong" />
      </View>
      {empty ? (
        <Animated.View entering={enterFade} exiting={exitFade} pointerEvents="none" className="absolute left-0 right-0 bottom-5 items-center">
          <T weight="semibold" className="text-[13px] text-subtle">
            Customer signs here
          </T>
        </Animated.View>
      ) : (
        <Animated.View entering={enterFade} exiting={exitFade} className="absolute top-3 right-3">
          <Tap onPress={clear} className="h-9 px-3 rounded-full bg-page flex-row items-center gap-1">
            <Icon name="clear" size={16} className="text-ink-soft" />
            <T weight="bold" className="text-[12px] text-ink-soft">
              Clear
            </T>
          </Tap>
        </Animated.View>
      )}
    </View>
  );
}
