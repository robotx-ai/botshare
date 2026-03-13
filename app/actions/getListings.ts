import prisma from "@/lib/prismadb";
import { isRobotxServiceCategory } from "@/lib/robotxServiceCategories";
import { isServiceAreaValue } from "@/lib/serviceLocation";

export interface IListingsParams {
  userId?: string;
  guestCount?: number;
  roomCount?: number;
  bathroomCount?: number;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
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
      startDate,
      endDate,
      category,
    } = params;

    let query: any = {};

    if (userId) {
      query.userId = userId;
    }

    if (category && !isRobotxServiceCategory(category)) {
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
    });

    const safeListings = listing.map((list) => ({
      ...list,
      createdAt: list.createdAt.toISOString(),
    }));

    if (!category) {
      safeListings.sort((a, b) => {
        const aIsShowcase = a.category === "Showcase & Performance" ? 0 : 1;
        const bIsShowcase = b.category === "Showcase & Performance" ? 0 : 1;
        return aIsShowcase - bIsShowcase;
      });
    }

    return safeListings;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
