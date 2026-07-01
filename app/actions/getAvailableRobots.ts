import prisma from "@/lib/prismadb";
import { safeListing } from "@/types";

export default async function getAvailableRobots(): Promise<safeListing[]> {
  const rows = await prisma.listing.findMany({
    where: { isIndividualOwned: true, status: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, businessName: true } },
    },
  });

  return rows.map(({ user, ...list }) => ({
    ...list,
    createdAt: list.createdAt.toISOString(),
    operatorName: user?.name || undefined, // owner's name, for org context
  }));
}
