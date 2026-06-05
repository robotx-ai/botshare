export interface SignGateState {
  scrolledToBottom: boolean;
  legalName: string;
  address: string;
  contactName: string;
  contactTitle: string;
  signedName: string;
  signedTitle: string;
  agreed: boolean;
}

const filled = (v: string) => v.trim().length > 0;

export function isSignReady(s: SignGateState): boolean {
  return (
    s.scrolledToBottom &&
    s.agreed &&
    filled(s.legalName) &&
    filled(s.address) &&
    filled(s.contactName) &&
    filled(s.contactTitle) &&
    filled(s.signedName) &&
    filled(s.signedTitle)
  );
}
