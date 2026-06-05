import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AgreementDocument from "./AgreementDocument";
import { buildFieldSnapshot } from "@/lib/agreementTemplate";

const snap = buildFieldSnapshot({
  agreementNo: "TPA-202606-0001",
  signedAt: new Date("2026-06-04T12:00:00Z"),
  listing: {
    title: "AGIBot A2 Showcase",
    locationValue: "Las Vegas Metro",
    metro: "VEGAS",
  },
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-07-08"),
  totalPrice: 7000,
  tierId: "gold",
  robotCount: 2,
  partyC: {
    legalName: "Acme Robotics LLC",
    taxId: null,
    address: "100 Main St",
    contactName: "Jane Doe",
    contactTitle: "COO",
  },
});

describe("AgreementDocument", () => {
  it("renders key agreement fields", () => {
    render(<AgreementDocument snapshot={snap} />);
    expect(
      screen.getAllByText(/Tripartite Robot Rental Platform Agreement/i).length
    ).toBeGreaterThan(0);
    expect(screen.getByText("TPA-202606-0001")).toBeInTheDocument();
    expect(screen.getAllByText(/Acme Robotics LLC/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nevada/).length).toBeGreaterThan(0);
  });
});
