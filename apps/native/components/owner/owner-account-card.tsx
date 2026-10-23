import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "heroui-native";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { Banner, Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { prettyPhone } from "@/lib/format";
import { enterUp, exitFade, haptic, layout } from "@/lib/motion";
import { trpc, trpcClient } from "@/utils/trpc";

function Editor({
  icon,
  label,
  value,
  first,
  open,
  onToggle,
  children,
}: {
  icon: IconName;
  label: string;
  value: string;
  first?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Animated.View layout={layout} className={cn(!first && "border-t border-line")}>
      <Tap onPress={onToggle} scaleTo={0.99} className="flex-row items-center gap-3 py-3.5">
        <Icon name={icon} size={20} className="text-subtle" />
        <T weight="bold" className="flex-1 text-[14px]">
          {label}
        </T>
        <T weight="semibold" className="text-[13px] text-subtle">
          {value}
        </T>
        <Icon name={open ? "expand-less" : "chevron-right"} size={20} className="text-subtle" />
      </Tap>
      {open ? (
        <Animated.View entering={enterUp(0)} exiting={exitFade} className="pb-3 gap-2">
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Settings → Owner account: the phone number and password Coline signs in with. */
export function OwnerAccountCard({ index = 0 }: { index?: number }) {
  const queryClient = useQueryClient();
  const team = useQuery(trpc.team.list.queryOptions());
  const owner = team.data?.find((person) => person.role === "OWNER");
  const [open, setOpen] = useState<"phone" | "password" | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [newPhone, setNewPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const toggle = (which: "phone" | "password") => {
    setDone(null);
    setOpen((current) => (current === which ? null : which));
  };

  const changePhone = useMutation({
    mutationFn: () => trpcClient.auth.changePhone.mutate({ currentPassword: phonePassword, newPhone }),
    onSuccess: (result) => {
      haptic.success();
      setDone(`Phone number changed to ${prettyPhone(result.phone ?? newPhone)}. Use it next time you set up a phone.`);
      setOpen(null);
      setNewPhone("");
      setPhonePassword("");
      void queryClient.invalidateQueries();
    },
    onError: () => haptic.error(),
  });

  const changePassword = useMutation({
    mutationFn: () => trpcClient.auth.changePassword.mutate({ currentPassword, newPassword }),
    onSuccess: () => {
      haptic.success();
      setDone("Password changed.");
      setOpen(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: () => haptic.error(),
  });

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <Card index={index} className="gap-0 py-0">
      <Editor
        first
        icon="call"
        label="Phone number"
        value={owner?.phone ? prettyPhone(owner.phone) : "…"}
        open={open === "phone"}
        onToggle={() => toggle("phone")}
      >
        <Field label="New phone number" icon="call" prefix="+263" keyboardType="phone-pad" placeholder="77 510 1506" value={newPhone} onChangeText={setNewPhone} />
        <Field label="Your current password" icon="lock" secret value={phonePassword} onChangeText={setPhonePassword} />
        {changePhone.error ? (
          <T weight="bold" className="text-[12px] text-alarm-ink">
            {changePhone.error.message}
          </T>
        ) : null}
        <Button
          label="Save number"
          icon="check"
          size="md"
          loading={changePhone.isPending}
          disabled={newPhone.replace(/\D/g, "").length < 9 || !phonePassword}
          onPress={() => changePhone.mutate()}
        />
      </Editor>

      <Editor icon="lock" label="Password" value="••••••••" open={open === "password"} onToggle={() => toggle("password")}>
        <Field label="Current password" icon="lock" secret value={currentPassword} onChangeText={setCurrentPassword} />
        <Field label="New password" icon="key" secret value={newPassword} onChangeText={setNewPassword} error={newPassword && newPassword.length < 8 ? "Use at least 8 characters" : null} />
        <Field
          label="New password again"
          icon="key"
          secret
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={confirmPassword && !passwordsMatch ? "The passwords don't match" : null}
        />
        {changePassword.error ? (
          <T weight="bold" className="text-[12px] text-alarm-ink">
            {changePassword.error.message}
          </T>
        ) : null}
        <Button
          label="Save password"
          icon="check"
          size="md"
          loading={changePassword.isPending}
          disabled={!currentPassword || newPassword.length < 8 || !passwordsMatch}
          onPress={() => changePassword.mutate()}
        />
      </Editor>

      {done ? (
        <View className="pb-3">
          <Banner tone="leaf" icon="check-circle" text={done} />
        </View>
      ) : null}
    </Card>
  );
}
