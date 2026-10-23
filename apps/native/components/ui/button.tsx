import { cn } from "heroui-native";
import { ActivityIndicator, View } from "react-native";

import { Icon, type IconName } from "./icon";
import { Tap } from "./tap";
import { T } from "./text";

/**
 * Colour says what a button does, the same everywhere in the app:
 * - primary (black): go forward a step (Continue, Next).
 * - success (green): finish, confirm or save (Done, It is fine, Save, Open).
 * - caution (orange border): change something (Edit, Change, New PIN).
 * - danger (soft red): start something destructive (Cancel it, Remove).
 * - destructive (solid red): confirm it (Cancel entry, Sign out, Clear).
 * - sun (yellow): add or bring money in (Add person, Add demo data).
 * - light / outline / ghost: back out or a quiet secondary choice (Later, Keep it).
 */
export type ButtonVariant =
  | "primary"
  | "success"
  | "caution"
  | "danger"
  | "destructive"
  | "sun"
  | "light"
  | "outline"
  | "ghost";

const VARIANT: Record<ButtonVariant, { box: string; ink: string; spinner: string }> = {
  primary: { box: "bg-ink", ink: "text-white", spinner: "#FFFFFF" },
  success: { box: "bg-leaf", ink: "text-white", spinner: "#FFFFFF" },
  caution: { box: "bg-white border-2 border-tangerine", ink: "text-tangerine-ink", spinner: "#A2461A" },
  danger: { box: "bg-alarm-soft", ink: "text-alarm-ink", spinner: "#A32020" },
  destructive: { box: "bg-alarm", ink: "text-white", spinner: "#FFFFFF" },
  sun: { box: "bg-sun", ink: "text-ink", spinner: "#141416" },
  light: { box: "bg-white", ink: "text-ink", spinner: "#141416" },
  outline: { box: "bg-white border border-line", ink: "text-ink", spinner: "#141416" },
  ghost: { box: "bg-transparent", ink: "text-ink-soft", spinner: "#4A4945" },
};

type Props = {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  size?: "lg" | "md" | "sm";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Pill buttons from the design: 56 dp main actions, 44 dp secondary, 36 dp inline. */
export function Button({
  label,
  onPress,
  icon,
  variant = "primary",
  size = "lg",
  loading,
  disabled,
  className,
}: Props) {
  const style = VARIANT[variant];
  const height = size === "lg" ? "h-14" : size === "md" ? "h-11" : "h-9";
  return (
    <Tap
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.97}
      accessibilityLabel={label}
      className={cn("rounded-full flex-row items-center justify-center gap-2 px-4", height, style.box, className)}
    >
      {loading ? (
        <ActivityIndicator color={style.spinner} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Icon name={icon} size={size === "sm" ? 16 : 20} className={style.ink} /> : null}
          <T weight="bold" className={cn(size === "sm" ? "text-[13px]" : "text-[15px]", style.ink)}>
            {label}
          </T>
        </View>
      )}
    </Tap>
  );
}

/** Round icon-only button, e.g. back and close. */
export function IconButton({
  icon,
  onPress,
  label,
  className,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  className?: string;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityLabel={label}
      scaleTo={0.9}
      className={cn("w-11 h-11 rounded-full bg-white border border-line items-center justify-center", className)}
    >
      <Icon name={icon} size={22} />
    </Tap>
  );
}
