import prisma from "@/lib/prismadb";
import { safeListing } from "@/types";

export default async function getMyRobots(userId: string): Promise<safeListing[]> {
  const rows = await prisma.listing.findMany({
    where: { userId, isIndividualOwned: true },
    orderBy: { createdAt: "desc" },
    include: {
      operator: { select: { name: true, businessName: true } },
    },
  });

  return rows.map(({ operator, ...list }) => ({
    ...list,
    createdAt: list.createdAt.toISOString(),
    operatorName: operator?.businessName || operator?.name || undefined,
  }));
}
