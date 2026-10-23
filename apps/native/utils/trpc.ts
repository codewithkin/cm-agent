import type { AppRouter } from "@cm-agent/api/routers/index";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { deviceStore } from "@/lib/device";
import { sessionStore } from "@/lib/session";

import { ENV } from "../src/env";

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep showing the last result while offline.
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      networkMode: "offlineFirst",
    },
  },
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${ENV.EXPO_PUBLIC_SERVER_URL}/trpc`,
      headers() {
        const device = deviceStore.get();
        const session = sessionStore.get();
        return {
          ...(device ? { authorization: `Bearer ${device.token}` } : {}),
          ...(session?.sessionToken ? { "x-session-token": session.sessionToken } : {}),
        };
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
