import type { Db } from "./types";

export type CustomerDetails = {
  /** Already normalised with normalizePhone. */
  phone: string;
  name: string;
  idNumber: string;
};

/**
 * Remembers a customer by phone number, keeping the latest name and ID number.
 * A real transaction makes a demo customer real, so clearing demo data keeps them.
 */
export function upsertCustomer(db: Db, details: CustomerDetails) {
  return db.customer.upsert({
    where: { phone: details.phone },
    update: { name: details.name, idNumber: details.idNumber, isDemo: false },
    create: { phone: details.phone, name: details.name, idNumber: details.idNumber },
  });
}
