"use client";

import useLoginModel from "@/hook/useLoginModal";
import { SafeReservation, SafeUser, safeListing } from "@/types";
import axios from "axios";
import { differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Range } from "react-date-range";
import { toast } from "react-toastify";

import Container from "./Container";
import ListingCTA from "./listing/ListingCTA";
import ListingFeatureCards from "./listing/ListingFeatureCards";
import ListingHead from "./listing/ListingHead";
import ListingInfo from "./listing/ListingInfo";
import ListingReservation from "./listing/ListingReservation";
import { TIERS } from "./listing/ServiceTierSelector";
import { categories } from "./navbar/Categories";
import { getScenarioPricing } from "@/lib/scenarioPricing";
import { getAgibotScenarioDetails } from "@/lib/agibotScenarioDetails";

const initialDateRange = {
  startDate: new Date(),
  endDate: new Date(),
  key: "selection",
};

type Props = {
  reservations?: SafeReservation[];
  listing: safeListing & {
    user: SafeUser;
  };
  currentUser?: SafeUser | null;
};

function ListingClient({ reservations = [], listing, currentUser }: Props) {
  const router = useRouter();
  const loginModal = useLoginModel();
  const scenarioPricing = getScenarioPricing(listing.title);

  const disableDates = useMemo(() => {
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

  const [isLoading, setIsLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(listing.price);
  const [dateRange, setDateRange] = useState<Range>(initialDateRange);
  const [selectedTierId, setSelectedTierId] = useState<string>("silver");
  const [robotCount, setRobotCount] = useState<number>(1);

  const onCreateReservation = useCallback(() => {
    if (!currentUser) {
      return loginModal.onOpen();
    }

    setIsLoading(true);

    axios
      .post("/api/reservations", {
        totalPrice,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        listingId: listing?.id,
      })
      .then(() => {
        toast.success("Booking confirmed");
        setDateRange(initialDateRange);
        router.push("/trips");
      })
      .catch(() => {
        toast.error("Something went wrong");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [totalPrice, dateRange, listing?.id, router, currentUser, loginModal]);

  useEffect(() => {
    let perDayPrice: number;
    if (scenarioPricing) {
      const priceMap: Record<string, number> = {
        silver: scenarioPricing.silver,
        gold: scenarioPricing.gold,
        premium: scenarioPricing.platinum,
      };
      perDayPrice = priceMap[selectedTierId] ?? listing.price;
    } else {
      const tier = TIERS.find((t) => t.id === selectedTierId);
      const multiplier = tier?.multiplier ?? 1;
      perDayPrice = listing.price * multiplier;
    }

    if (dateRange.startDate && dateRange.endDate) {
      const dayCount = differenceInCalendarDays(
        dateRange.endDate,
        dateRange.startDate
      );

      if (dayCount && listing.price) {
        setTotalPrice(dayCount * perDayPrice * robotCount);
      } else {
        setTotalPrice(perDayPrice * robotCount);
      }
    }
  }, [dateRange, listing.price, selectedTierId, robotCount, scenarioPricing]);

  const category = useMemo(() => {
    return categories.find((item) => item.label === listing.category);
  }, [listing.category]);

  const agibotScenario = useMemo(() => {
    return getAgibotScenarioDetails(listing.title);
  }, [listing.title]);

  return (
    <Container>
      <div className="max-w-screen-lg mx-auto">
        <div className="flex flex-col gap-6">
          <ListingHead
            title={listing.title}
            imageSrc={listing.imageSrc}
            videoSrc={listing.videoSrc}
            locationValue={listing.locationValue}
            id={listing.id}
            currentUser={currentUser}
          />
          {listing.category && (
            <ListingFeatureCards category={listing.category} />
          )}
          <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">
            <ListingInfo
              user={listing.user}
              category={category}
              description={listing.description}
              roomCount={listing.roomCount}
              guestCount={listing.guestCount}
              bathroomCount={listing.bathroomCount}
              locationValue={listing.locationValue}
              agibotScenario={agibotScenario}
            />
            <div className="order-first mb-10 md:order-last md:col-span-3">
              <ListingReservation
                price={listing.price}
                totalPrice={totalPrice}
                onChangeDate={(value) => setDateRange(value)}
                dateRange={dateRange}
                onSubmit={onCreateReservation}
                disabled={isLoading}
                disabledDates={disableDates}
                selectedTierId={selectedTierId}
                onTierChange={setSelectedTierId}
                robotCount={robotCount}
                onRobotCountChange={setRobotCount}
                fixedPrices={scenarioPricing ?? undefined}
              />
            </div>
          </div>
          <ListingCTA />
        </div>
      </div>
    </Container>
  );
}

export default ListingClient;
