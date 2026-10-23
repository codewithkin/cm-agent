import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { withUniwind } from "uniwind";

export type IconName = ComponentProps<typeof MaterialIcons>["name"];

const StyledIcon = withUniwind(MaterialIcons);

type Props = {
  name: IconName;
  size?: number;
  /** Tailwind text colour, e.g. "text-subtle". */
  className?: string;
  color?: string;
};

/** Material icons, as in the design (Material Symbols Rounded). */
export function Icon({ name, size = 20, className = "text-ink", color }: Props) {
  return <StyledIcon name={name} size={size} className={className} color={color} />;
}
