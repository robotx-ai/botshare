import prisma from "@/lib/prismadb";
import { safeListing } from "@/types";

export default async function getAvailableRobots(): Promise<safeListing[]> {
  const rows = await prisma.listing.findMany({
    where: { isIndividualOwned: true, status: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((list) => ({
    ...list,
    createdAt: list.createdAt.toISOString(),
    operatorName: undefined,
  }));
}
