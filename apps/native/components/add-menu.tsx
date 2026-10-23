import { router } from "expo-router";

import { FabMenu, type FabAction } from "@/components/ui/fab";
import { useOpenShift } from "@/lib/booth";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

/**
 * Everything a person can add from where they are. Same list on every main
 * tab, for Coline on any phone and for helpers on a booth phone.
 */
export function useAddActions(): FabAction[] {
  const session = useObservable(sessionStore);
  const shift = useOpenShift();
  const isOwner = session?.user.role === "OWNER";
  const countFirst = (next: "start" | "end") =>
    isOwner ? router.push(next === "start" ? "/shift/start" : "/shift/end") : router.push({ pathname: "/owner-pin", params: { next } });

  return [
    ...(shift
      ? []
      : [
          {
            icon: "play-circle" as const,
            label: "Start a shift",
            hint: isOwner ? "Count the money on this phone, then serve" : "Coline counts the money first",
            onPress: () => countFirst("start"),
          },
        ]),
    {
      icon: "south-west",
      label: "New cash-in",
      hint: shift ? "Customer gives cash, gets EcoCash" : "Start a shift first",
      onPress: () => router.push({ pathname: "/transaction/new", params: { type: "CASH_IN" } }),
    },
    {
      icon: "north-east",
      label: "New cash-out",
      hint: shift ? "Customer sends EcoCash, gets cash" : "Start a shift first",
      onPress: () => router.push({ pathname: "/transaction/new", params: { type: "CASH_OUT" } }),
    },
    {
      icon: "sms",
      label: "Paste an EcoCash SMS",
      hint: "For a message the app didn't catch",
      onPress: () => router.push("/paste-sms"),
    },
    ...(isOwner && shift
      ? [{ icon: "swap-horiz" as const, label: "Move money", hint: "Float bought, cash taken or added", onPress: () => router.push("/move-money") }]
      : []),
    ...(shift
      ? [
          {
            icon: "stop-circle" as const,
            label: "End the shift",
            hint: isOwner ? "Count the money and close" : "Coline counts the money to close",
            onPress: () => countFirst("end"),
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            icon: "person-add" as const,
            label: "Add a person",
            hint: "A helper with their own PIN",
            onPress: () => router.push({ pathname: "/people", params: { add: "1" } }),
          },
          {
            icon: "add-to-home-screen" as const,
            label: "Add a phone",
            hint: "Set up another booth or owner phone",
            onPress: () => router.push({ pathname: "/phones", params: { add: "1" } }),
          },
        ]
      : []),
  ];
}

/** The yellow "+ Add" button on every main tab. */
export function AddMenu() {
  return <FabMenu actions={useAddActions()} />;
}
