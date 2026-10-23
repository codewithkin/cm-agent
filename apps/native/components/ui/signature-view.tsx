import { View } from "react-native";
import { SvgXml } from "react-native-svg";

import { T } from "./text";

/** Shows a saved signature (an SVG data URL from the signature pad). */
export function SignatureView({ signature, height = 140 }: { signature: string | null | undefined; height?: number }) {
  const prefix = "data:image/svg+xml;utf8,";
  if (!signature?.startsWith(prefix)) {
    return (
      <View className="items-center justify-center rounded-2xl bg-page" style={{ height }}>
        <T weight="semibold" className="text-[12px] text-subtle">
          Signature not available on this phone
        </T>
      </View>
    );
  }
  return (
    <View className="rounded-2xl bg-page p-2" style={{ height }}>
      <SvgXml xml={decodeURIComponent(signature.slice(prefix.length))} width="100%" height="100%" />
    </View>
  );
}
