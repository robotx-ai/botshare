"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Modal from "./Modal";
import useAgreementModal from "@/hook/useAgreementModal";
import AgreementDocument from "../agreement/AgreementDocument";
import { buildFieldSnapshot } from "@/lib/agreementTemplate";
import { isSignReady } from "@/lib/agreementSignGate";

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-black">
      <span className="text-gray-600">{label}</span>
      <input
        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-black disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function AgreementModal() {
  const { isOpen, booking, onClose } = useAgreementModal();
  const [isLoading, setIsLoading] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [signedName, setSignedName] = useState("");
  const [signedTitle, setSignedTitle] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLegalName("");
      setTaxId("");
      setAddress("");
      setContactName("");
      setContactTitle("");
      setSignedName("");
      setSignedTitle("");
      setAgreed(false);
      setScrolledToBottom(false);
      setIsLoading(false);
    }
  }, [isOpen, booking?.listingId]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const previewSnapshot = useMemo(() => {
    if (!booking) return null;
    return buildFieldSnapshot({
      agreementNo: "TPA-PREVIEW",
      signedAt: new Date(),
      listing: {
        title: booking.listingTitle,
        locationValue: "Deployment location on file",
        metro: booking.metro,
      },
      startDate: new Date(booking.startDate),
      endDate: new Date(booking.endDate),
      totalPrice: booking.totalPrice,
      tierId: booking.tierId,
      robotCount: booking.robotCount,
      partyC: {
        legalName: legalName || "[Customer legal entity name]",
        taxId: taxId || null,
        address: address || "[Address]",
        contactName: contactName || "[Contact]",
        contactTitle: contactTitle || "[Title]",
      },
    });
  }, [booking, legalName, taxId, address, contactName, contactTitle]);

  const ready = isSignReady({
    scrolledToBottom,
    legalName,
    address,
    contactName,
    contactTitle,
    signedName,
    signedTitle,
    agreed,
  });

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      setScrolledToBottom(true);
    }
  }, []);

  const handleSign = useCallback(() => {
    if (!booking || !ready) return;
    setIsLoading(true);

    axios
      .post("/api/agreements", {
        listingId: booking.listingId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalPrice: booking.totalPrice,
        tierId: booking.tierId,
        robotCount: booking.robotCount,
        partyC: {
          legalName,
          taxId: taxId || null,
          address,
          contactName,
          contactTitle,
        },
        signedName,
        signedTitle,
      })
      .then((res) => {
        const agreementId = res.data?.agreementId as string | undefined;
        if (!agreementId) {
          toast.error("Could not record the agreement. Please try again.");
          setIsLoading(false);
          return;
        }
        return axios
          .post("/api/checkout", {
            agreementId,
            totalPrice: booking.totalPrice,
            startDate: booking.startDate,
            endDate: booking.endDate,
            listingId: booking.listingId,
          })
          .then((checkout) => {
            const url = checkout.data?.url as string | undefined;
            if (url) {
              window.location.href = url;
            } else {
              toast.error("Could not start checkout. Please try again.");
              setIsLoading(false);
            }
          });
      })
      .catch(() => {
        toast.error("Something went wrong");
        setIsLoading(false);
      });
    // success path intentionally leaves spinner on — browser navigates to Stripe
  }, [
    booking,
    ready,
    legalName,
    taxId,
    address,
    contactName,
    contactTitle,
    signedName,
    signedTitle,
  ]);

  const body = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="Company legal name"
          value={legalName}
          onChange={setLegalName}
          disabled={isLoading}
        />
        <Field
          label="Tax ID (optional)"
          value={taxId}
          onChange={setTaxId}
          disabled={isLoading}
        />
        <Field
          label="Company address"
          value={address}
          onChange={setAddress}
          disabled={isLoading}
        />
        <Field
          label="Contact person"
          value={contactName}
          onChange={setContactName}
          disabled={isLoading}
        />
        <Field
          label="Contact title"
          value={contactTitle}
          onChange={setContactTitle}
          disabled={isLoading}
        />
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="max-h-[40vh] overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white"
      >
        {previewSnapshot && <AgreementDocument snapshot={previewSnapshot} />}
      </div>
      {!scrolledToBottom && (
        <p className="text-xs text-gray-500">
          Scroll to the end of the agreement to enable signing.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="Type your legal name"
          value={signedName}
          onChange={setSignedName}
          disabled={isLoading}
        />
        <Field
          label="Your title"
          value={signedTitle}
          onChange={setSignedTitle}
          disabled={isLoading}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-black">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={isLoading}
        />
        I have read and agree to the Tripartite Robot Rental Platform Agreement.
      </label>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      title="Sign rental agreement"
      actionLabel="Sign & continue to payment"
      onClose={onClose}
      onSubmit={handleSign}
      disabled={isLoading || !ready}
      body={body}
    />
  );
}

export default AgreementModal;
