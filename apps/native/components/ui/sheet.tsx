import type { PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "./button";
import { T } from "./text";

type Props = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
}>;

/** A white panel over the bottom of the screen, for short forms and choices. Tap outside or × to close. */
export function Sheet({ visible, onClose, title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, styles.backdrop]} />
        <View className="bg-page rounded-t-[28px] px-4 pt-4 gap-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <T weight="heavy" className="text-[20px]">
                {title}
              </T>
              {subtitle ? (
                <T weight="semibold" className="text-[12px] text-subtle">
                  {subtitle}
                </T>
              ) : null}
            </View>
            <IconButton icon="close" label="Close" onPress={onClose} />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(20,20,22,0.45)" },
});
