import getCurrentUser from "@/app/actions/getCurrentUser";
import { isAdminEmail } from "@/lib/adminAuth";
import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import {
  canTransition,
  isOrderStatus,
  resolveOrderRole,
  type OrderStatus,
} from "@/lib/orderStatus";
import { NextResponse } from "next/server";

interface IParams {
  reservationId?: string;
}

export async function PATCH(
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

  const body = await request.json().catch(() => null);
  const targetStatus = body?.status;
  const note = typeof body?.note === "string" ? body.note : null;

  if (!isOrderStatus(targetStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { listing: { select: { userId: true } } },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const role = resolveOrderRole({
    currentUserId: currentUser.id,
    customerId: reservation.userId,
    providerId: reservation.listing.userId,
    isAdmin: isAdminEmail(currentUser.email),
  });

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentStatus = reservation.status as OrderStatus;

  if (!canTransition(currentStatus, targetStatus, role)) {
    return NextResponse.json(
      { error: `Cannot move from ${currentStatus} to ${targetStatus}.` },
      { status: 409 }
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id: reservationId },
      data: { status: targetStatus },
    }),
    prisma.reservationEvent.create({
      data: {
        reservationId,
        status: targetStatus,
        actorId: currentUser.id,
        note,
      },
    }),
  ]);

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
  });
}
