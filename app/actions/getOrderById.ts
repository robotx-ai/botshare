import prisma from "@/lib/prismadb";
import { isAdminEmail } from "@/lib/adminAuth";
import { resolveOrderRole, type OrderStatus } from "@/lib/orderStatus";
import { SafeOrderDetail, SafeUser } from "@/types";

export default async function getOrderById(
  reservationId: string,
  currentUser: SafeUser
): Promise<SafeOrderDetail | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      listing: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!reservation) return null;

  const role = resolveOrderRole({
    currentUserId: currentUser.id,
    customerId: reservation.userId,
    providerId: reservation.listing.userId,
    isAdmin: isAdminEmail(currentUser.email),
  });

  if (!role) return null; // access denied → caller treats as not found

  // Resolve actor names for the timeline (small N, one query).
  const actorIds = Array.from(new Set(reservation.events.map((e) => e.actorId)));
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(actors.map((a) => [a.id, a.name ?? null]));

  return {
    ...reservation,
    createdAt: reservation.createdAt.toISOString(),
    startDate: reservation.startDate.toISOString(),
    endDate: reservation.endDate.toISOString(),
    status: reservation.status as OrderStatus,
    providerId: reservation.listing.userId,
    listing: {
      ...reservation.listing,
      createdAt: reservation.listing.createdAt.toISOString(),
    },
    events: reservation.events.map((e) => ({
      ...e,
      status: e.status as OrderStatus,
      createdAt: e.createdAt.toISOString(),
      actorName: nameById.get(e.actorId) ?? null,
    })),
  };
}
