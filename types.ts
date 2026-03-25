import { Listing, Reservation, User } from "@prisma/client";

export type safeListing = Omit<Listing, "createdAt"> & {
  createdAt: string;
  operatorName?: string;
};

export type SafeReservation = Omit<
  Reservation,
  "createdAt" | "startDate" | "endDate" | "listing"
> & {
  createdAt: string;
  startDate: string;
  endDate: string;
  listing: safeListing;
};

export type SafeAdminReservation = SafeReservation & {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerBusinessName: string | null;
};

export type SafeUser = Omit<
  User,
  "createdAt" | "updatedAt" | "emailVerified"
> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  favoriteListingIds: string[];
};
