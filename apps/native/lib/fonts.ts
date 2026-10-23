import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";

/** Loaded once in the root layout with useFonts. Only the weights the app uses, to keep the APK small. */
export const APP_FONTS = {
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  JetBrainsMono_500Medium,
};

/** Android picks custom font weights by family name, not fontWeight. */
export const FONT_FAMILY = {
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  heavy: "Manrope_800ExtraBold",
  mono: "JetBrainsMono_500Medium",
} as const;

export type FontWeight = keyof typeof FONT_FAMILY;
