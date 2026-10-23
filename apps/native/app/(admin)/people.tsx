import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "heroui-native";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { LiveState } from "@/components/owner/live-state";
import { Button } from "@/components/ui/button";
import { Avatar, Banner, Card } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { Tap } from "@/components/ui/tap";
import { T } from "@/components/ui/text";
import { initials } from "@/lib/format";
import { haptic } from "@/lib/motion";
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
    <View className={cn(index > 0 && "border-t border-line")}>
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
          <Button variant="success" label="Bring back" size="sm" loading={setActive.isPending} onPress={() => setActive.mutate(true)} />
        ) : !owner ? (
          <Icon name={open ? "expand-less" : "expand-more"} size={24} className="text-subtle" />
        ) : null}
      </Tap>

      {open ? (
        <View className="pb-3 gap-2">
          {newPin ? (
            <Banner tone="leaf" icon="key" text={`New PIN for ${person.name}: ${newPin}. They choose their own when they sign in.`} />
          ) : null}
          <View className="flex-row gap-2">
            <Button
              variant="caution"
              label="New PIN"
              icon="key"
              size="md"
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
        </View>
      ) : null}
    </View>
  );
}

/** "+ Add person": a name, then their starting PIN to tell them in person. */
function AddPerson({ startOpen }: { startOpen: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(startOpen);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<{ name: string; pin: string } | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      const pin = randomPin();
      await trpcClient.team.addHelper.mutate({ name: name.trim(), pin });
      return { name: name.trim(), pin };
    },
    onSuccess: (result) => {
      haptic.success();
      setCreated(result);
      setName("");
      void queryClient.invalidateQueries();
      void syncNow();
    },
    onError: () => haptic.error(),
  });

  const close = () => {
    setOpen(false);
    setCreated(null);
    add.reset();
  };

  return (
    <>
      <Fab label="Add person" icon="person-add" onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={close} title={created ? `${created.name} is added` : "Add a person"} subtitle="Helpers see only their own work.">
        {created ? (
          <>
            <View className="items-center gap-1 p-4 rounded-3xl bg-white border border-line">
              <T weight="bold" className="text-[12px] text-subtle">
                Starting PIN
              </T>
              <T weight="heavy" className="text-[40px] tracking-[8px]">
                {created.pin}
              </T>
              <T weight="semibold" className="text-[12px] text-subtle text-center">
                Tell {created.name} in person. They choose their own PIN when they first sign in.
              </T>
            </View>
            <Button variant="success" label="Done" icon="check" onPress={close} />
            <Button variant="ghost" size="md" label="Add another" onPress={() => setCreated(null)} />
          </>
        ) : (
          <>
            <Field icon="person" label="Name" placeholder="e.g. Kuda" value={name} onChangeText={setName} autoCapitalize="words" autoFocus />
            {add.isError ? <Banner tone="danger" icon="error" text="Couldn't add them. Check the internet and try again." /> : null}
            <Button
              variant="sun"
              label="Add person"
              icon="person-add"
              loading={add.isPending}
              disabled={!name.trim()}
              onPress={() => add.mutate()}
            />
          </>
        )}
      </Sheet>
    </>
  );
}

/** C8 People: add helpers, give a new PIN, remove (records are kept). */
export default function People() {
  const { add } = useLocalSearchParams<{ add?: string }>();
  const team = useQuery(trpc.team.list.queryOptions());
  const people = team.data ?? [];
  const active = people.filter((person) => person.active);

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
      fab={<AddPerson startOpen={add === "1"} />}
    >
      <LiveState query={team}>
        <Card title="People" className="gap-0">
          {people.map((person, index) => (
            <PersonRow key={person.id} person={person} index={index} />
          ))}
        </Card>
        {active.length <= 1 ? (
          <Banner tone="lilac" icon="person-add" text="No helpers yet. Tap Add person to give your son or daughter their own PIN." />
        ) : null}
      </LiveState>
    </Screen>
  );
}
