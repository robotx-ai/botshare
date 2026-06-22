"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import { SafeReservation, SafeUser } from "@/types";
import React from "react";

type Props = {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

function TripsClient({ reservations, currentUser }: Props) {
  return (
    <Container>
      <Heading
        title="My Scheduled Services"
        subtitle="Upcoming and past service bookings."
      />
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
        {reservations.map((reservation) => (
          <ListingCard
            key={reservation.id}
            data={reservation.listing}
            reservation={reservation}
            currentUser={currentUser}
          />
        ))}
      </div>
    </Container>
  );
}

export default TripsClient;
