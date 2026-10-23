import { router } from "expo-router";

import type { FabAction } from "@/components/ui/fab";

/** What the "+ Add" button offers at the booth: the two transactions, and Coline's extras. */
export function boothActions(isOwner: boolean): FabAction[] {
  return [
    {
      icon: "south-west",
      label: "New cash-in",
      hint: "Customer gives cash, gets EcoCash",
      onPress: () => router.push({ pathname: "/transaction/new", params: { type: "CASH_IN" } }),
    },
    {
      icon: "north-east",
      label: "New cash-out",
      hint: "Customer sends EcoCash, gets cash",
      onPress: () => router.push({ pathname: "/transaction/new", params: { type: "CASH_OUT" } }),
    },
    ...(isOwner
      ? [
          { icon: "swap-horiz" as const, label: "Move money", hint: "Float bought, cash taken or added", onPress: () => router.push("/move-money") },
          {
            icon: "person-add" as const,
            label: "Add a person",
            hint: "A helper with their own PIN",
            onPress: () => router.push({ pathname: "/people", params: { add: "1" } }),
          },
        ]
      : []),
  ];
}
