import { differenceInCalendarDays } from "date-fns";
import type { Metro } from "@/lib/metro";
import {
  PARTY_A,
  PARTY_B,
  PartySignatory,
  governingStateForMetro,
} from "@/lib/agreementParties";

export const TEMPLATE_VERSION = "tripartite-v1";

export function formatAgreementNo(date: Date, seq: number): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const seqStr = String(seq).padStart(4, "0");
  return `TPA-${year}${month}-${seqStr}`;
}

export function termDurationDays(start: Date, end: Date): number {
  return differenceInCalendarDays(end, start);
}

export interface PartyCInput {
  legalName: string;
  taxId?: string | null;
  address: string;
  contactName: string;
  contactTitle: string;
}

export interface SnapshotInput {
  agreementNo: string;
  signedAt: Date;
  listing: { title: string; locationValue: string; metro: Metro };
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  tierId: string;
  robotCount: number;
  partyC: PartyCInput;
}

export interface AgreementSnapshot {
  agreementNo: string;
  templateVersion: string;
  dateOfAgreement: string;
  partyA: PartySignatory;
  partyB: PartySignatory;
  partyC: PartyCInput;
  equipment: {
    model: string;
    serialNo: string;
    condition: string;
    quantity: number;
  };
  location: { delivery: string; deployment: string };
  term: { commencement: string; expiry: string; durationDays: number };
  pricing: {
    rentalCharges: number;
    shipping: null;
    platformFee: null;
    taxes: null;
    deposit: null;
    totalDue: number;
  };
  governingState: string;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildFieldSnapshot(input: SnapshotInput): AgreementSnapshot {
  return {
    agreementNo: input.agreementNo,
    templateVersion: TEMPLATE_VERSION,
    dateOfAgreement: isoDate(input.signedAt),
    partyA: PARTY_A,
    partyB: PARTY_B,
    partyC: {
      legalName: input.partyC.legalName,
      taxId: input.partyC.taxId ?? null,
      address: input.partyC.address,
      contactName: input.partyC.contactName,
      contactTitle: input.partyC.contactTitle,
    },
    equipment: {
      model: input.listing.title,
      serialNo: "To be assigned at shipment",
      condition: "Good - Pre-rental Inspection Required",
      quantity: input.robotCount,
    },
    location: {
      delivery: input.listing.locationValue,
      deployment: input.listing.locationValue,
    },
    term: {
      commencement: isoDate(input.startDate),
      expiry: isoDate(input.endDate),
      durationDays: termDurationDays(input.startDate, input.endDate),
    },
    pricing: {
      rentalCharges: input.totalPrice,
      shipping: null,
      platformFee: null,
      taxes: null,
      deposit: null,
      totalDue: input.totalPrice,
    },
    governingState: governingStateForMetro(input.listing.metro),
  };
}
