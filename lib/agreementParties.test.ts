import { describe, expect, it } from "vitest";
import { PARTY_A, PARTY_B, governingStateForMetro } from "./agreementParties";

describe("agreementParties", () => {
  it("maps each metro to its US state", () => {
    expect(governingStateForMetro("SF")).toBe("California");
    expect(governingStateForMetro("LA")).toBe("California");
    expect(governingStateForMetro("VEGAS")).toBe("Nevada");
    expect(governingStateForMetro("DALLAS")).toBe("Texas");
    expect(governingStateForMetro("NYC")).toBe("New York");
    expect(governingStateForMetro("MIAMI")).toBe("Florida");
  });

  it("falls back to the default state for unknown metros", () => {
    // @ts-expect-error testing fallback path
    expect(governingStateForMetro("MARS")).toBe("Delaware");
  });

  it("exposes Party A and Party B signatory blocks", () => {
    expect(PARTY_A.companyName).toContain("BotSharing");
    expect(PARTY_A.signatoryName).toBeTruthy();
    expect(PARTY_B.companyName).toContain("Robot X");
    expect(PARTY_B.signatoryName).toBeTruthy();
  });
});
