import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { LiveState } from "@/components/owner/live-state";
import { Button } from "@/components/ui/button";
import { Avatar, Banner, Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { initials } from "@/lib/format";
import { enterUp, exitFade, haptic, layout } from "@/lib/motion";
import { syncNow } from "@/lib/sync";
import { trpc, trpcClient, type RouterOutputs } from "@/utils/trpc";

type Person = RouterOutputs["team"]["list"][number];

const randomPin = () => String(Math.floor(1000 + Math.random() * 9000));

function PersonRow({ person, index }: { person: Person; index: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newPin, setNewPin] = useState<string | null>(null);
  const owner = person.role === "OWNER";
  const refresh = () => {
    void queryClient.invalidateQueries();
    void syncNow();
  };

  const resetPin = useMutation({
    mutationFn: (pin: string) => trpcClient.team.resetPin.mutate({ userId: person.id, pin }),
    onSuccess: (_, pin) => {
      haptic.success();
      setNewPin(pin);
      refresh();
    },
  });
  const setActive = useMutation({
    mutationFn: (active: boolean) => trpcClient.team.setActive.mutate({ userId: person.id, active }),
    onSuccess: () => {
      haptic.warning();
      setOpen(false);
      refresh();
    },
  });

  return (
    <Animated.View entering={enterUp(index)} exiting={exitFade} layout={layout} className={cn(index > 0 && "border-t border-line")}>
      <Tap
        onPress={() => !owner && person.active && setOpen((value) => !value)}
        scaleTo={0.99}
        className="flex-row items-center gap-3 py-3"
      >
        <Avatar label={initials(person.name)} owner={owner} className={person.active ? undefined : "opacity-40"} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <T weight="heavy" className={person.active ? "text-[14px]" : "text-[14px] text-subtle"}>
              {person.name}
            </T>
            <View className={cn("px-1.5 py-0.5 rounded-md", owner ? "bg-ink" : person.active ? "bg-lilac" : "bg-line")}>
              <T weight="heavy" className={cn("text-[10px]", owner ? "text-white" : "text-lilac-ink")}>
                {owner ? "Owner" : person.active ? "Helper" : "Off"}
              </T>
            </View>
          </View>
          <T weight="semibold" className="text-[12px] text-subtle">
            {owner ? "Sees everything" : person.active ? "Own work only" : "Removed · records kept"}
          </T>
        </View>
        {!owner && !person.active ? (
          <Button label="Bring back" size="sm" variant="outline" loading={setActive.isPending} onPress={() => setActive.mutate(true)} />
        ) : !owner ? (
          <Icon name={open ? "expand-less" : "expand-more"} size={24} className="text-subtle" />
        ) : null}
      </Tap>

      {open ? (
        <Animated.View entering={enterUp(0)} exiting={exitFade} className="pb-3 gap-2">
          {newPin ? (
            <Banner tone="leaf" icon="key" text={`New PIN for ${person.name}: ${newPin}. They choose their own when they sign in.`} />
          ) : null}
          <View className="flex-row gap-2">
            <Button
              label="New PIN"
              icon="key"
              size="md"
              variant="outline"
              className="flex-1"
              loading={resetPin.isPending}
              onPress={() => resetPin.mutate(randomPin())}
            />
            <Button
              label="Remove"
              icon="person-off"
              size="md"
              variant="danger"
              className="flex-1"
              loading={setActive.isPending}
              onPress={() => setActive.mutate(false)}
            />
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** C8 People: add helpers, give a new PIN, remove (records are kept). */
export default function People() {
  const queryClient = useQueryClient();
  const team = useQuery(trpc.team.list.queryOptions());
  const [name, setName] = useState("");
  const [createdPin, setCreatedPin] = useState<{ name: string; pin: string } | null>(null);
  const people = team.data ?? [];
  const active = people.filter((person) => person.active);

  const add = useMutation({
    mutationFn: async () => {
      const pin = randomPin();
      await trpcClient.team.addHelper.mutate({ name: name.trim(), pin });
      return pin;
    },
    onSuccess: (pin) => {
      haptic.success();
      setCreatedPin({ name: name.trim(), pin });
      setName("");
      void queryClient.invalidateQueries();
      void syncNow();
    },
  });

  return (
    <Screen
      header={{
        title: "People",
        right: (
          <View className="flex-row items-center gap-1 h-[30px] px-2.5 rounded-full bg-white border border-line">
            <T weight="bold" className="text-[11px]">
              Active {active.length}
            </T>
          </View>
        ),
      }}
    >
      <Card index={0} title="Add a person">
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <Field icon="person" placeholder="Name, e.g. Kuda" value={name} onChangeText={setName} autoCapitalize="words" />
          </View>
          <Button label="Add" icon="add" variant="sun" size="md" loading={add.isPending} disabled={!name.trim()} onPress={() => add.mutate()} />
        </View>
        <T weight="semibold" className="text-[12px] text-subtle">
          They get a starting PIN, then choose their own.
        </T>
        {createdPin ? (
          <Banner tone="leaf" icon="key" text={`${createdPin.name}'s starting PIN: ${createdPin.pin}. Tell them in person.`} />
        ) : null}
      </Card>

      <LiveState query={team}>
        <Card index={1} title="People" className="gap-0">
          {people.map((person, index) => (
            <PersonRow key={person.id} person={person} index={index} />
          ))}
        </Card>
      </LiveState>
    </Screen>
  );
}
