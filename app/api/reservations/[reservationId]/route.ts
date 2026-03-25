import getCurrentUser from "@/app/actions/getCurrentUser";
import { isAdminEmail } from "@/lib/adminAuth";
import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { NextResponse } from "next/server";

interface IParams {
  reservationId?: string;
}

export async function DELETE(
  request: Request,
  { params }: { params: IParams }
) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reservationId } = params;

  if (!reservationId || typeof reservationId !== "string") {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  // Admins can cancel any booking; others can only cancel their own or bookings on their services
  const where = isAdminEmail(currentUser.email)
    ? { id: reservationId }
    : {
        id: reservationId,
        OR: [
          { userId: currentUser.id },
          { listing: { userId: currentUser.id } },
        ],
      };

  const reservation = await prisma.reservation.deleteMany({ where });

  return NextResponse.json(reservation);
}
