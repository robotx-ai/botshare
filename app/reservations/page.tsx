import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import { isAdminEmail } from "@/lib/adminAuth";
import React from "react";
import getCurrentUser from "../actions/getCurrentUser";
import getReservation from "../actions/getReservations";
import ReservationsClient from "./ReservationsClient";

type Props = {};

const ReservationsPage = async (props: Props) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }

  const reservations = await getReservation(
    isAdminEmail(currentUser.email) ? {} : { authorId: currentUser.id }
  );

  if (reservations.length === 0) {
    return (
      <ClientOnly>
        <EmptyState
          title="No bookings found"
          subtitle="Looks like there are no bookings on your services."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <ReservationsClient
        reservations={reservations}
        currentUser={currentUser}
      />
    </ClientOnly>
  );
};

export default ReservationsPage;
