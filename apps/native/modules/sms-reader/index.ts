import { NativeModule, requireOptionalNativeModule } from "expo";

export type NativeSms = {
  sender: string;
  body: string;
  /** Milliseconds since 1970. */
  receivedAt: number;
};

type Events = {
  onSms: (sms: NativeSms) => void;
};

declare class SmsReaderModule extends NativeModule<Events> {
  readInboxSince(sinceMillis: number, senders: string[]): Promise<NativeSms[]>;
}

// Missing on iOS, in Expo Go, and before a new development build.
const native = requireOptionalNativeModule<SmsReaderModule>("SmsReader");

export const smsReaderAvailable = native !== null;

export function addSmsListener(listener: (sms: NativeSms) => void): { remove: () => void } {
  return native ? native.addListener("onSms", listener) : { remove: () => {} };
}

export function readInboxSince(sinceMillis: number, senders: string[]): Promise<NativeSms[]> {
  return native ? native.readInboxSince(sinceMillis, senders) : Promise.resolve([]);
}
