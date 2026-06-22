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

  // Hard delete is admin-only true removal; owner/customer cancellation now goes
  // through the soft-cancel status transition (PATCH .../status -> CANCELLED).
  if (!isAdminEmail(currentUser.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reservation = await prisma.reservation.deleteMany({
    where: { id: reservationId },
  });

  return NextResponse.json(reservation);
}
