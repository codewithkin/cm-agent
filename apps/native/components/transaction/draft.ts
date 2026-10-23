import { normalizePhone } from "@cm-agent/api/lib/phone";

import { centsFromInput } from "@/lib/format";

/** Everything typed in New transaction, across its three steps. */
export type Draft = {
  type: "CASH_IN" | "CASH_OUT";
  currency: "USD" | "ZIG";
  amountText: string;
  smsId: string | null;
  phone: string;
  name: string;
  idNumber: string;
  reference: string;
  signature: string | null;
  /** "Save without SMS" was chosen. */
  manual: boolean;
  note: string;
};

export const EMPTY_DRAFT: Draft = {
  type: "CASH_OUT",
  currency: "USD",
  amountText: "",
  smsId: null,
  phone: "",
  name: "",
  idNumber: "",
  reference: "",
  signature: null,
  manual: false,
  note: "",
};

export const draftCents = (draft: Draft) => centsFromInput(draft.amountText);

export const draftPhone = (draft: Draft) => normalizePhone(draft.phone);

export function customerReady(draft: Draft) {
  return Boolean(draftPhone(draft)) && draft.name.trim().length > 0 && draft.idNumber.trim().length >= 3;
}
