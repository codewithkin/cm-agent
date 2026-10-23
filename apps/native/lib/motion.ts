import * as Haptics from "expo-haptics";

/**
 * Shared timings for the few things that still move: presses, the PIN dots,
 * the stepper and toggles. Screens and cards appear without entry or exit animations.
 */
export const DURATION = { fast: 160, base: 240, slow: 340 } as const;

export const SPRING = { damping: 16, stiffness: 220, mass: 0.6 } as const;
export const PRESS_SPRING = { damping: 18, stiffness: 420, mass: 0.4 } as const;

/** Haptics, kept in one place so they stay subtle. */
export const haptic = {
  tap: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  select: () => void Haptics.selectionAsync(),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
