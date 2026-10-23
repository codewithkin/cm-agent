import type { ReactNode } from "react";

import { Banner } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { onlineStore } from "@/lib/network";
import { useObservable } from "@/lib/observable";
import { sessionStore } from "@/lib/session";

type QueryLike = { isPending: boolean; isError: boolean; data?: unknown; refetch: () => unknown };

/**
 * Owner screens read live from the server. This shows a skeleton while loading,
 * keeps the last result on screen while offline, and explains what's wrong.
 */
export function LiveState({ query, children, rows = 4 }: { query: QueryLike; children: ReactNode; rows?: number }) {
  const online = useObservable(onlineStore);
  const session = useObservable(sessionStore);
  const hasData = query.data !== undefined;

  const notice = !online
    ? "No internet. Showing what was loaded last."
    : !session?.sessionToken
      ? "Connecting… you unlocked this phone offline."
      : query.isError
        ? "Couldn't load this. Tap to try again."
        : null;

  return (
    <>
      {notice ? (
        <Banner
          tone={query.isError && online ? "danger" : "amber"}
          icon={online ? "sync-problem" : "cloud-off"}
          text={notice}
          onAction={query.isError ? () => void query.refetch() : undefined}
          actionLabel={query.isError && online ? "Retry" : undefined}
        />
      ) : null}
      {hasData ? children : query.isPending ? <SkeletonRows count={rows} /> : null}
    </>
  );
}
