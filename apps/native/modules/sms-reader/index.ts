import { NativeModule, requireOptionalNativeModule } from "expo";

/** One SMS the person allowed the app to read. */
export type ConsentedSms = {
  body: string;
  /** Milliseconds since 1970 (when it was allowed). */
  receivedAt: number;
};

type Events = {
  onSms: (sms: ConsentedSms) => void;
  /** No SMS arrived in the 5-minute listening window. */
  onTimeout: () => void;
  /** The person tapped "Deny" on Android's consent sheet. */
  onDenied: () => void;
  /** An SMS arrived while the app was in the background; the sheet shows when it reopens. */
  onPending: () => void;
};

declare class SmsReaderModule extends NativeModule<Events> {
  startListening(): Promise<boolean>;
  stopListening(): void;
}

// Missing on iOS, in Expo Go, and before a new development build.
const native = requireOptionalNativeModule<SmsReaderModule>("SmsReader");

export const smsReaderAvailable = native !== null;

/**
 * Watches for the next incoming SMS for up to 5 minutes (Google's SMS User
 * Consent API). Resolves false when Google Play services can't start it.
 */
export function startListening(): Promise<boolean> {
  return native ? native.startListening() : Promise.resolve(false);
}

export function stopListening() {
  native?.stopListening();
}

export function addSmsReaderListener<E extends keyof Events>(event: E, listener: Events[E]): { remove: () => void } {
  return native ? native.addListener(event, listener) : { remove: () => {} };
}
