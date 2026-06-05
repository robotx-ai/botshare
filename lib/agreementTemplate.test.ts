import { describe, expect, it } from "vitest";
import {
  TEMPLATE_VERSION,
  formatAgreementNo,
  termDurationDays,
} from "./agreementTemplate";

describe("agreementTemplate", () => {
  it("pins the template version", () => {
    expect(TEMPLATE_VERSION).toBe("tripartite-v1");
  });

  it("formats agreement numbers as TPA-YYYYMM-NNNN", () => {
    const date = new Date("2026-06-04T12:00:00Z");
    expect(formatAgreementNo(date, 1)).toBe("TPA-202606-0001");
    expect(formatAgreementNo(date, 42)).toBe("TPA-202606-0042");
    expect(formatAgreementNo(new Date("2026-12-01T00:00:00Z"), 7)).toBe(
      "TPA-202612-0007"
    );
  });

  it("computes term duration in whole days", () => {
    expect(
      termDurationDays(new Date("2026-06-01"), new Date("2026-06-06"))
    ).toBe(5);
  });
});
