"use client";

import useSearchModal from "@/hook/useSearchModal";
import { formatISO } from "date-fns";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { useCallback, useMemo, useState } from "react";
import { Range } from "react-date-range";
import { getMetroCentroid } from "@/lib/metro";
import useZipCheck from "@/hook/useZipCheck";

import Heading from "../Heading";
import Calendar from "../inputs/Calendar";
import Modal from "./Modal";

enum STEPS {
  LOCATION = 0,
  DATE = 1,
}

type Props = {};

function SearchModal({}: Props) {
  const defaultCenter = getMetroCentroid("LA");
  const router = useRouter();
  const params = useSearchParams();
  const searchModel = useSearchModal();

  const [zipCode, setZipCode] = useState("");
  const [step, setStep] = useState(STEPS.LOCATION);
  const { zipData, invalid: zipInvalid } = useZipCheck(zipCode);
  const [dateRange, setDateRange] = useState<Range>({
    startDate: new Date(),
    endDate: new Date(),
    key: "selection",
  });

  const Map = useMemo(
    () =>
      dynamic(() => import("../Map"), {
        ssr: false,
      }),
    []
  );

  const onBack = useCallback(() => {
    setStep((value) => value - 1);
  }, []);

  const onNext = useCallback(() => {
    setStep((value) => value + 1);
  }, []);

  const onSubmit = useCallback(() => {
    if (step === STEPS.LOCATION) {
      if (zipCode && (zipCode.length !== 5 || !zipData)) {
        return;
      }
      return onNext();
    }

    if (step !== STEPS.DATE) {
      return onNext();
    }

    let currentQuery = {};

    if (params) {
      currentQuery = qs.parse(params.toString());
    }

    const updatedQuery: any = {
      ...currentQuery,
      ...(zipCode ? { zipCode } : {}),
    };

    delete updatedQuery.locationValue;
    delete updatedQuery.guestCount;
    delete updatedQuery.roomCount;
    delete updatedQuery.bathroomCount;

    if (dateRange.startDate) {
      updatedQuery.startDate = formatISO(dateRange.startDate);
    }

    if (dateRange.endDate) {
      updatedQuery.endDate = formatISO(dateRange.endDate);
    }

    const url = qs.stringifyUrl(
      {
        url: "/services",
        query: updatedQuery,
      },
      { skipNull: true }
    );

    setStep(STEPS.LOCATION);
    searchModel.onClose();

    router.push(url);
  }, [
    step,
    searchModel,
    router,
    zipCode,
    zipData,
    dateRange,
    onNext,
    params,
  ]);

  const actionLabel = useMemo(() => {
    if (step === STEPS.DATE) {
      return "Find Services";
    }

    return "Next";
  }, [step]);

  const secondActionLabel = useMemo(() => {
    if (step === STEPS.LOCATION) {
      return undefined;
    }

    return "Back";
  }, [step]);

  let bodyContent = (
    <div className="flex flex-col gap-8">
      <Heading
        title="Where do you need service?"
        subtitle="Enter a zip code to find services in your area."
      />
      <input
        type="text"
        inputMode="numeric"
        maxLength={5}
        placeholder="Enter zip code"
        value={zipCode}
        onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
        className={`w-full p-4 font-light bg-white border-2 rounded-md outline-none transition ${
          zipInvalid
            ? "border-red-500 focus:border-red-500"
            : "border-neutral-300 focus:border-black"
        }`}
      />
      {zipInvalid && (
        <p className="text-sm text-red-500 -mt-4">
          We don&apos;t service that area yet.
        </p>
      )}
      <Map
        center={zipData ? [zipData.lat, zipData.lng] : defaultCenter}
        metro={zipData?.metro}
        zipCode={zipData ? zipCode : undefined}
      />
    </div>
  );

  if (step === STEPS.DATE) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="When should service run?"
          subtitle="Choose your booking dates."
        />
        <Calendar
          onChange={(value) => setDateRange(value.selection)}
          value={dateRange}
        />
      </div>
    );
  }

  return (
    <Modal
      isOpen={searchModel.isOpen}
      onClose={searchModel.onClose}
      onSubmit={onSubmit}
      secondaryAction={step === STEPS.LOCATION ? undefined : onBack}
      secondaryActionLabel={secondActionLabel}
      title="Filters"
      actionLabel={actionLabel}
      body={bodyContent}
    />
  );
}

export default SearchModal;
