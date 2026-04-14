import prisma from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import { isServiceCategory } from "@/lib/serviceCategories";
import { isServiceAreaValue } from "@/lib/serviceLocation";
import { getZipCentroid } from "@/lib/zipCentroid";

export interface IListingsParams {
  userId?: string;
  guestCount?: number;
  roomCount?: number;
  bathroomCount?: number;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
  zipCode?: string;
  category?: string;
  robotModel?: string;
}

export default async function getListings(params: IListingsParams) {
  try {
    const {
      userId,
      roomCount,
      guestCount,
      bathroomCount,
      locationValue,
      zipCode,
      startDate,
      endDate,
      category,
    } = params;

    let query: any = {};

    if (userId) {
      query.userId = userId;
    }

    if (category && !isServiceCategory(category)) {
      return [];
    }

    if (category) {
      query.category = category;
    }

    if (roomCount) {
      query.roomCount = {
        gte: +roomCount,
      };
    }

    if (guestCount) {
      query.guestCount = {
        gte: +guestCount,
      };
    }

    if (bathroomCount) {
      query.bathroomCount = {
        gte: +bathroomCount,
      };
    }

    if (locationValue && isServiceAreaValue(locationValue)) {
      query.locationValue = locationValue;
    }

    if (zipCode) {
      const centroid = await getZipCentroid(zipCode);
      if (centroid) {
        const nearbyRows = await prisma.$queryRaw<{ id: string }[]>(
          Prisma.sql`
            SELECT DISTINCT ON (title) id
            FROM "Listing"
            WHERE lat IS NOT NULL AND lng IS NOT NULL
              AND (
                3959 * acos(
                  LEAST(1.0,
                    cos(radians(${centroid.lat})) * cos(radians(lat)) *
                    cos(radians(lng) - radians(${centroid.lng})) +
                    sin(radians(${centroid.lat})) * sin(radians(lat))
                  )
                )
              ) <= 100
            ORDER BY title,
              (3959 * acos(
                LEAST(1.0,
                  cos(radians(${centroid.lat})) * cos(radians(lat)) *
                  cos(radians(lng) - radians(${centroid.lng})) +
                  sin(radians(${centroid.lat})) * sin(radians(lat))
                )
              )) ASC
          `
        );
        if (nearbyRows.length === 0) return [];
        query.id = { in: nearbyRows.map((r) => r.id) };
      } else {
        query.zipCode = zipCode;
      }
    }

    if (startDate && endDate) {
      query.NOT = {
        reservations: {
          some: {
            OR: [
              {
                endDate: { gte: startDate },
                startDate: { lte: startDate },
              },
              {
                startDate: { lte: endDate },
                endDate: { gte: endDate },
              },
            ],
          },
        },
      };
    }

    const listing = await prisma.listing.findMany({
      where: query,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: { select: { name: true, businessName: true } },
      },
    });

    const safeListings = listing.map(({ user, ...list }) => ({
      ...list,
      createdAt: list.createdAt.toISOString(),
      operatorName: user?.businessName || user?.name || undefined,
    }));

    if (!category) {
      safeListings.sort((a, b) => {
        const aIsShowcase = a.category === "Showcase & Performance" ? 0 : 1;
        const bIsShowcase = b.category === "Showcase & Performance" ? 0 : 1;
        return aIsShowcase - bIsShowcase;
      });
    }

    // Catalog browse (no userId): deduplicate by title so each service
    // appears once regardless of how many locations it's listed in.
    if (!userId) {
      const seen = new Set<string>();
      return safeListings.filter((l) => {
        if (seen.has(l.title)) return false;
        seen.add(l.title);
        return true;
      });
    }

    return safeListings;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
