import * as Haptics from "expo-haptics";
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
  LinearTransition,
  SlideInDown,
  SlideInUp,
  SlideOutDown,
  SlideOutUp,
  ZoomIn,
} from "react-native-reanimated";

/** Shared timings so every screen moves the same way. Nothing runs longer than 350 ms. */
export const DURATION = { fast: 160, base: 240, slow: 340 } as const;

export const SPRING = { damping: 16, stiffness: 220, mass: 0.6 } as const;
export const PRESS_SPRING = { damping: 18, stiffness: 420, mass: 0.4 } as const;

const ease = Easing.out(Easing.cubic);

/** Cards and rows fading up as a screen opens: pass the item's position for a short stagger. */
export function enterUp(index = 0) {
  return FadeInDown.duration(DURATION.base)
    .delay(Math.min(index, 8) * 45)
    .easing(ease);
}

export const exitFade = FadeOut.duration(DURATION.fast);
export const enterFade = FadeIn.duration(DURATION.base);
export const exitDown = FadeOutDown.duration(DURATION.fast);
export const exitUp = FadeOutUp.duration(DURATION.fast);
export const enterFromTop = FadeInUp.duration(DURATION.base).easing(ease);

/** Banners that drop in from the top of the screen. */
export const bannerIn = SlideInUp.duration(DURATION.base).easing(ease);
export const bannerOut = SlideOutUp.duration(DURATION.fast);

/** Sheets and bottom bars. */
export const sheetIn = SlideInDown.springify().damping(SPRING.damping).stiffness(SPRING.stiffness);
export const sheetOut = SlideOutDown.duration(DURATION.base);

/** A celebratory pop, e.g. the Saved tick. */
export const popIn = ZoomIn.springify().damping(10).stiffness(180);

/** Rows that move when others are added or removed. */
export const layout = LinearTransition.duration(DURATION.base).easing(ease);

/** Haptics, kept in one place so they stay subtle. */
export const haptic = {
  tap: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  select: () => void Haptics.selectionAsync(),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
