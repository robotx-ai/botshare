"use client";

import Calendar from "@/components/inputs/Calendar";
import useLoginModel from "@/hook/useLoginModal";
import { SafeReservation, SafeUser } from "@/types";
import axios from "axios";
import { differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Range } from "react-date-range";
import { toast } from "react-toastify";

const initialDateRange = {
  startDate: new Date(),
  endDate: new Date(),
  key: "selection",
};

type Props = {
  model: string;
  dayPrice: number;
  fourHourPrice: number;
  listingId: string;
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

function RobotTypeBookingClient({
  model,
  dayPrice,
  fourHourPrice,
  listingId,
  reservations,
  currentUser,
}: Props) {
  const router = useRouter();
  const loginModal = useLoginModel();

  const [duration, setDuration] = useState<"four-hour" | "day">("four-hour");
  const [robotCount, setRobotCount] = useState(1);
  const [dateRange, setDateRange] = useState<Range>(initialDateRange);
  const [isLoading, setIsLoading] = useState(false);

  const disabledDates = useMemo(() => {
    let dates: Date[] = [];
    reservations.forEach((reservation) => {
      const range = eachDayOfInterval({
        start: new Date(reservation.startDate),
        end: new Date(reservation.endDate),
      });
      dates = [...dates, ...range];
    });
    return dates;
  }, [reservations]);

  const totalPrice = useMemo(() => {
    if (duration === "four-hour") {
      return fourHourPrice * robotCount;
    }

    if (dateRange.startDate && dateRange.endDate) {
      const dayCount = differenceInCalendarDays(
        dateRange.endDate,
        dateRange.startDate
      );
      const days = dayCount > 0 ? dayCount : 1;
      return dayPrice * robotCount * days;
    }

    return dayPrice * robotCount;
  }, [dateRange, dayPrice, duration, fourHourPrice, robotCount]);

  const onBook = useCallback(() => {
    if (!currentUser) {
      return loginModal.onOpen();
    }

    if (!dateRange.startDate) {
      return toast.error("Please select a booking date.");
    }

    const startDate = dateRange.startDate;
    const endDate =
      duration === "four-hour" ? dateRange.startDate : dateRange.endDate;

    if (!endDate) {
      return toast.error("Please select a booking end date.");
    }

    setIsLoading(true);
    axios
      .post("/api/reservations", {
        listingId,
        startDate,
        endDate,
        totalPrice,
      })
      .then(() => {
        toast.success("Booking confirmed");
        router.push("/trips");
      })
      .catch(() => {
        toast.error("Something went wrong");
      })
      .finally(() => setIsLoading(false));
  }, [currentUser, dateRange.endDate, dateRange.startDate, duration, listingId, loginModal, router, totalPrice]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Type of deal
      </p>
      <p className="mt-1 text-2xl font-bold text-black">Single Type Deal</p>
      <p className="mt-1 text-sm text-neutral-500">
        Book {model} directly by 4 hours or per day.
      </p>

      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold text-black">Calendar</p>
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <Calendar
            value={dateRange}
            disabledDates={disabledDates}
            onChange={(value) => setDateRange(value.selection)}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setDuration("four-hour")}
          className={`rounded-lg border px-4 py-3 text-left transition ${
            duration === "four-hour"
              ? "border-neutral-900 bg-neutral-50"
              : "border-neutral-300 hover:border-neutral-500"
          }`}
        >
          <p className="text-sm font-semibold">4 hours</p>
          <p className="text-xs text-neutral-500">${fourHourPrice}</p>
        </button>
        <button
          type="button"
          onClick={() => setDuration("day")}
          className={`rounded-lg border px-4 py-3 text-left transition ${
            duration === "day"
              ? "border-neutral-900 bg-neutral-50"
              : "border-neutral-300 hover:border-neutral-500"
          }`}
        >
          <p className="text-sm font-semibold">Per day</p>
          <p className="text-xs text-neutral-500">${dayPrice}</p>
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between border-y border-neutral-200 py-4">
        <div>
          <p className="text-sm font-semibold">Number of robots</p>
          <p className="text-xs text-neutral-400">Max 3</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setRobotCount((count) => Math.max(1, count - 1))}
            className="h-7 w-7 rounded-full border border-neutral-300 text-lg text-neutral-600"
          >
            −
          </button>
          <span className="w-4 text-center text-base font-semibold">{robotCount}</span>
          <button
            type="button"
            onClick={() => setRobotCount((count) => Math.min(3, count + 1))}
            className="h-7 w-7 rounded-full border border-neutral-300 text-lg text-neutral-600"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={isLoading}
        onClick={onBook}
        className="mt-4 w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        Book single type deal
      </button>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-neutral-500">Estimated total</span>
        <span className="text-xl font-bold text-black">${totalPrice}</span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        Per-day booking is the most cost-effective option for longer deployments.
      </p>
    </div>
  );
}

export default RobotTypeBookingClient;
