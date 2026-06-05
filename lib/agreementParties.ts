import type { Metro } from "@/lib/metro";

export interface PartySignatory {
  companyName: string;
  stateOfFormation: string;
  address: string;
  website: string;
  signatoryName: string;
  signatoryTitle: string;
  email: string;
  phone: string;
}

// TODO(go-live): replace placeholder values with real registered entity details.
export const PARTY_A: PartySignatory = {
  companyName: "BotSharing [U.S. legal entity name]",
  stateOfFormation: "[State]",
  address: "[U.S. business address]",
  website: "botsharing.us",
  signatoryName: "[Authorized Signatory Name]",
  signatoryTitle: "[Title]",
  email: "[email address]",
  phone: "[phone number]",
};

// TODO(go-live): replace placeholder values with real registered entity details.
export const PARTY_B: PartySignatory = {
  companyName: "Robot X [U.S. legal entity name]",
  stateOfFormation: "[State]",
  address: "[U.S. business address]",
  website: "[website]",
  signatoryName: "[Authorized Signatory Name]",
  signatoryTitle: "[Title]",
  email: "[email address]",
  phone: "[phone number]",
};

export const DEFAULT_GOVERNING_STATE = "Delaware";

const METRO_STATE: Record<Metro, string> = {
  SF: "California",
  LA: "California",
  VEGAS: "Nevada",
  DALLAS: "Texas",
  NYC: "New York",
  MIAMI: "Florida",
};

export function governingStateForMetro(metro: Metro): string {
  return METRO_STATE[metro] ?? DEFAULT_GOVERNING_STATE;
}
