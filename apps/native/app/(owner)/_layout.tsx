import { useQuery } from "@tanstack/react-query";
import { Redirect, Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/ui/tab-bar";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";
import { trpc } from "@/utils/trpc";

/** Owner tabs: Today · Check · History · Reports · More. Coline only. */
export default function OwnerLayout() {
  const session = useObservable(sessionStore);
  const review = useQuery({
    ...trpc.review.queue.queryOptions(),
    enabled: Boolean(session?.sessionToken) && session?.user.role === "OWNER",
    refetchInterval: 60_000,
  });

  if (!session) return <Redirect href="/lock" />;
  if (session.user.role !== "OWNER") return <Redirect href="/no-access" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#F4F3EF" }, animation: "shift" }}
      tabBar={(props) => (
        <FloatingTabBar
          {...props}
          items={[
            { name: "today", label: "Today", icon: "space-dashboard" },
            { name: "review", label: "Check", icon: "fact-check", badge: review.data?.count },
            { name: "history", label: "History", icon: "history" },
            { name: "reports", label: "Reports", icon: "bar-chart" },
            { name: "more", label: "More", icon: "more-horiz" },
          ]}
        />
      )}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="review" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
