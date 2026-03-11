"use client";

import React from "react";
import { Range } from "react-date-range";
import Calendar from "../inputs/Calendar";
import Button from "../Button";
import ServiceTierSelector, { TIERS } from "./ServiceTierSelector";
import { ScenarioPricing } from "@/lib/scenarioPricing";

type Props = {
  price: number;
  dateRange: Range;
  totalPrice: number;
  onChangeDate: (value: Range) => void;
  onSubmit: () => void;
  disabled?: boolean;
  disabledDates: Date[];
  selectedTierId: string;
  onTierChange: (tierId: string) => void;
  robotCount: number;
  onRobotCountChange: (count: number) => void;
  fixedPrices?: ScenarioPricing;
};

function ListingReservation({
  price,
  dateRange,
  totalPrice,
  onChangeDate,
  onSubmit,
  disabled,
  disabledDates,
  selectedTierId,
  onTierChange,
  robotCount,
  onRobotCountChange,
  fixedPrices,
}: Props) {
  const selectedTier = TIERS.find((t) => t.id === selectedTierId)!;
  const isCustomQuote = selectedTier.multiplier === null;

  return (
    <div className="bg-white rounded-xl border-[1px] border-neutral-200 overflow-hidden">
      {/* Tier selector */}
      <div className="p-4">
        <ServiceTierSelector
          basePrice={price}
          selectedTierId={selectedTierId}
          onSelect={onTierChange}
          fixedPrices={fixedPrices}
        />
      </div>
      <hr />

      {/* Robot quantity stepper */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Number of robots</p>
          <p className="text-xs text-neutral-400">Max 3</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onRobotCountChange(Math.max(1, robotCount - 1))}
            className="w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center text-lg text-neutral-600 hover:border-neutral-500 transition"
          >
            −
          </button>
          <span className="text-base font-semibold w-4 text-center">
            {robotCount}
          </span>
          <button
            type="button"
            onClick={() => onRobotCountChange(Math.min(3, robotCount + 1))}
            className="w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center text-lg text-neutral-600 hover:border-neutral-500 transition"
          >
            +
          </button>
        </div>
      </div>
      <hr />

      {/* Date picker */}
      <Calendar
        value={dateRange}
        disabledDates={disabledDates}
        onChange={(value) => onChangeDate(value.selection)}
      />
      <hr />

      {/* Book / Quote button */}
      <div className="p-4">
        {isCustomQuote ? (
          <a
            href="#"
            className="block w-full text-center bg-black text-white text-sm font-semibold py-3 rounded-lg hover:bg-neutral-800 transition"
          >
            Get a Custom Quote
          </a>
        ) : (
          <Button disabled={disabled} label="Book Service" onClick={onSubmit} />
        )}
      </div>
      <hr />

      {/* Price summary */}
      <div className="p-4 flex flex-col gap-1">
        {!isCustomQuote && (
          <div className="flex justify-between text-sm text-neutral-500">
            <span>
              {selectedTier.label} · {robotCount} robot
              {robotCount > 1 ? "s" : ""}
            </span>
            <span>
              $
              {fixedPrices
                ? selectedTierId === "silver"
                  ? fixedPrices.silver
                  : selectedTierId === "gold"
                  ? fixedPrices.gold
                  : fixedPrices.platinum
                : Math.round(price * (selectedTier.multiplier ?? 1))}{" "}
              / day
            </span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-lg">
          <p>{isCustomQuote ? "Custom pricing" : "Total"}</p>
          <p>{isCustomQuote ? "—" : `$ ${totalPrice}`}</p>
        </div>
      </div>
    </div>
  );
}

export default ListingReservation;
