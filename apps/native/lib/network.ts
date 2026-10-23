import * as Network from "expo-network";

import { observable } from "./observable";

/** Whether the phone can reach the internet. Assumed online until told otherwise. */
export const onlineStore = observable<boolean>(true);

function isOnline(state: Network.NetworkState) {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

/** Starts watching connectivity; returns a stop function. */
export function watchNetwork(onChange?: (online: boolean) => void) {
  void Network.getNetworkStateAsync().then((state) => onlineStore.set(isOnline(state)));
  const subscription = Network.addNetworkStateListener((state) => {
    const online = isOnline(state);
    const changed = online !== onlineStore.get();
    onlineStore.set(online);
    if (changed) onChange?.(online);
  });
  return () => subscription.remove();
}
