import { describe, expect, it } from "vitest";
import { isSignReady, SignGateState } from "./agreementSignGate";

const ready: SignGateState = {
  scrolledToBottom: true,
  legalName: "Acme Robotics LLC",
  address: "100 Main St",
  contactName: "Jane Doe",
  contactTitle: "COO",
  signedName: "Jane Doe",
  signedTitle: "COO",
  agreed: true,
};

describe("isSignReady", () => {
  it("returns true when every requirement is met", () => {
    expect(isSignReady(ready)).toBe(true);
  });

  it("is false until scrolled to bottom", () => {
    expect(isSignReady({ ...ready, scrolledToBottom: false })).toBe(false);
  });

  it("is false when a required Party C field is blank", () => {
    expect(isSignReady({ ...ready, legalName: "  " })).toBe(false);
    expect(isSignReady({ ...ready, address: "" })).toBe(false);
    expect(isSignReady({ ...ready, contactName: "" })).toBe(false);
    expect(isSignReady({ ...ready, contactTitle: "" })).toBe(false);
  });

  it("is false without a typed signature name/title", () => {
    expect(isSignReady({ ...ready, signedName: "" })).toBe(false);
    expect(isSignReady({ ...ready, signedTitle: "" })).toBe(false);
  });

  it("is false until the agree box is checked", () => {
    expect(isSignReady({ ...ready, agreed: false })).toBe(false);
  });
});
