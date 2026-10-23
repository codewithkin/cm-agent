import { cn } from "heroui-native";
import { Text as RNText, type TextProps } from "react-native";

import { FONT_FAMILY, type FontWeight } from "@/lib/fonts";

type Props = TextProps & {
  className?: string;
  /** Manrope weight, or "mono" for JetBrains Mono. Defaults to semibold. */
  weight?: FontWeight;
};

/** All app text. Picks the font family for the weight, since Android ignores fontWeight for custom fonts. */
export function T({ weight = "semibold", className, style, ...props }: Props) {
  return (
    <RNText
      className={cn("text-ink text-[15px]", className)}
      style={[{ fontFamily: FONT_FAMILY[weight] }, style]}
      {...props}
    />
  );
}
