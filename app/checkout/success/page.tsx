import Container from "@/components/Container";
import {
  sendAdminBookingNotification,
  sendCustomerBookingConfirmation,
} from "@/lib/email";
import prisma from "@/lib/prismadb";
import stripe from "@/lib/stripe";
import Link from "next/link";
import { redirect } from "next/navigation";

interface Props {
  searchParams: { session_id?: string };
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    redirect("/");
  }

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch {
    redirect("/");
  }

  if (session.payment_status !== "paid") {
    redirect("/");
  }

  const { userId, listingId, startDate, endDate, totalPrice } =
    session.metadata ?? {};

  if (!userId || !listingId || !startDate || !endDate || !totalPrice) {
    redirect("/");
  }

  // Idempotent: skip create if reservation already exists for this session
  const existing = await prisma.reservation.findUnique({
    where: { stripeSessionId: sessionId },
  });

  const isNewReservation = !existing;

  const reservation =
    existing ??
    (await prisma.reservation.create({
      data: {
        userId,
        listingId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalPrice: parseInt(totalPrice, 10),
        stripeSessionId: sessionId,
      },
    }));

  // Send email notifications exactly once (skip on page refresh)
  if (isNewReservation) {
    const [customer, listing] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, phone: true, userType: true },
      }),
      prisma.listing.findUnique({
        where: { id: listingId },
        select: { title: true, category: true, locationValue: true },
      }),
    ]);

    const emailData = { reservation, customer, listing };

    try {
      await Promise.all([
        sendAdminBookingNotification(emailData),
        customer?.email
          ? sendCustomerBookingConfirmation(emailData)
          : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("Booking email notification failed:", err);
    }
  }

  return (
    <Container>
      <div className="max-w-lg mx-auto py-20 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Booking Confirmed</h1>
        <p className="text-neutral-500 text-sm">
          Your service booking has been received and payment processed. You will
          receive a confirmation email shortly.
        </p>
        <div className="w-full border border-neutral-200 rounded-xl p-4 text-left text-sm text-neutral-600 flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="font-medium text-neutral-800">Booking ID</span>
            <span className="font-mono text-xs text-neutral-500">
              {reservation.id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-neutral-800">Total paid</span>
            <span className="font-semibold text-neutral-900">
              ${parseInt(totalPrice).toLocaleString()}
            </span>
          </div>
        </div>
        <Link
          href="/trips"
          className="mt-2 inline-block bg-black text-white text-sm font-semibold px-8 py-3 rounded-lg hover:bg-neutral-800 transition"
        >
          View My Bookings
        </Link>
      </div>
    </Container>
  );
}
