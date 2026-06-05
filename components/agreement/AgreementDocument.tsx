import React from "react";
import type { AgreementSnapshot } from "@/lib/agreementTemplate";

interface Props {
  snapshot: AgreementSnapshot;
  signature?: { name: string; title: string; date: string } | null;
}

const money = (v: number | null) =>
  v === null ? "$ —" : `$${v.toLocaleString()}`;

function SignatureBlock({
  label,
  p,
  executed,
}: {
  label: string;
  p: { signatoryName: string; signatoryTitle: string };
  executed?: boolean;
}) {
  return (
    <div>
      <p className="font-semibold">{label}</p>
      <p>
        /s/ {p.signatoryName}, {p.signatoryTitle}
        {executed ? " — pre-executed" : ""}
      </p>
    </div>
  );
}

function AgreementDocument({ snapshot: s, signature }: Props) {
  return (
    <article className="text-sm text-black leading-relaxed space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-bold">
          Tripartite Robot Rental Platform Agreement
        </h1>
        <p className="text-gray-600">
          BotSharing Platform Transaction for Robot X Equipment Rental
        </p>
      </header>

      <section>
        <h2 className="font-semibold">Contract Summary</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-gray-500">Agreement No.</dt>
          <dd>{s.agreementNo}</dd>
          <dt className="text-gray-500">Date of Agreement</dt>
          <dd>{s.dateOfAgreement}</dd>
          <dt className="text-gray-500">Commencement</dt>
          <dd>{s.term.commencement}</dd>
          <dt className="text-gray-500">Expiry</dt>
          <dd>{s.term.expiry}</dd>
          <dt className="text-gray-500">Equipment</dt>
          <dd>
            {s.equipment.model} × {s.equipment.quantity}
          </dd>
          <dt className="text-gray-500">Deployment Location</dt>
          <dd>{s.location.deployment}</dd>
          <dt className="text-gray-500">Governing Law</dt>
          <dd>{s.governingState}</dd>
        </dl>
      </section>

      <section>
        <h2 className="font-semibold">1. Parties</h2>
        <p>
          <strong>Party A — Platform &amp; Payment Collection:</strong>{" "}
          {s.partyA.companyName}, {s.partyA.address}.
        </p>
        <p>
          <strong>Party B — Equipment Owner &amp; Lessor:</strong>{" "}
          {s.partyB.companyName}, {s.partyB.address}.
        </p>
        <p>
          <strong>Party C — Lessee / Customer:</strong> {s.partyC.legalName}
          {s.partyC.taxId ? ` (Tax ID ${s.partyC.taxId})` : ""},{" "}
          {s.partyC.address}. Contact: {s.partyC.contactName},{" "}
          {s.partyC.contactTitle}.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">3. Equipment</h2>
        <p>
          {s.equipment.model} — Serial No.: {s.equipment.serialNo} — Condition:{" "}
          {s.equipment.condition} — Quantity: {s.equipment.quantity}.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">5. Commercial Terms (USD)</h2>
        <ul className="list-disc pl-5">
          <li>Rental Charges: {money(s.pricing.rentalCharges)}</li>
          <li>Shipping / Logistics: {money(s.pricing.shipping)} (if applicable)</li>
          <li>Platform Service Fee: {money(s.pricing.platformFee)} (if applicable)</li>
          <li>Taxes: {money(s.pricing.taxes)} (if applicable)</li>
          <li>Security Deposit: {money(s.pricing.deposit)} (if applicable)</li>
          <li>
            <strong>Total Amount Due: {money(s.pricing.totalDue)}</strong>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">16. Governing Law</h2>
        <p>
          This Agreement is governed by the laws of the State of{" "}
          {s.governingState}, and disputes are subject to the state and federal
          courts located in {s.governingState}.
        </p>
      </section>

      <p className="text-gray-600 italic">
        Full terms (Sections 2, 4, 6–15, 17 and Appendices A–E) of the
        BotSharing Tripartite Robot Rental Platform Agreement, template version{" "}
        {s.templateVersion}, apply and are incorporated by reference. Party A and
        Party B are pre-executed; Party C executes electronically below.
      </p>

      <section className="grid grid-cols-1 gap-3 pt-4 border-t border-gray-200">
        <SignatureBlock label="Party A — BotSharing" p={s.partyA} executed />
        <SignatureBlock label="Party B — Robot X" p={s.partyB} executed />
        <div>
          <p className="font-semibold">Party C — Lessee / Customer</p>
          {signature ? (
            <p>
              /s/ {signature.name}, {signature.title} — {signature.date}
            </p>
          ) : (
            <p className="text-gray-400">Signature pending</p>
          )}
        </div>
      </section>
    </article>
  );
}

export default AgreementDocument;
