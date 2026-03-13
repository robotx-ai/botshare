import { safeListing } from "@/types";
import {
  computeDailySavingsVsFourHour,
  computeFourHourPrice,
} from "./rentalPricing";
import {
  getRobotModelFromListing,
  normalizeRobotText,
  slugifyRobotModel,
} from "./robotModel";

export type RobotTypeCardData = {
  model: string;
  modelSlug: string;
  imageSrc: string;
  categories: string[];
  dayPrice: number;
  fourHourPrice: number;
  dailySavingsPercent: number;
  listingCount: number;
  primaryListingId: string;
};

export function buildRobotTypeCatalog(listings: safeListing[]): RobotTypeCardData[] {
  const grouped = new Map<
    string,
    {
      imageSrc: string;
      categories: Set<string>;
      dayPrice: number;
      listingCount: number;
      primaryListingId: string;
    }
  >();

  for (const listing of listings) {
    const model = getRobotModelFromListing(listing);
    const existing = grouped.get(model);

    if (!existing) {
      grouped.set(model, {
        imageSrc: listing.imageSrc,
        categories: new Set([listing.category]),
        dayPrice: listing.price,
        listingCount: 1,
        primaryListingId: listing.id,
      });
      continue;
    }

    existing.categories.add(listing.category);
    existing.listingCount += 1;
    if (listing.price < existing.dayPrice) {
      existing.dayPrice = listing.price;
      existing.primaryListingId = listing.id;
      existing.imageSrc = listing.imageSrc;
    }
  }

  return Array.from(grouped.entries())
    .map(([model, value]) => {
      const fourHourPrice = computeFourHourPrice(value.dayPrice);
      return {
        model,
        modelSlug: slugifyRobotModel(model),
        imageSrc: value.imageSrc,
        categories: Array.from(value.categories).sort(),
        dayPrice: value.dayPrice,
        fourHourPrice,
        dailySavingsPercent: computeDailySavingsVsFourHour(value.dayPrice),
        listingCount: value.listingCount,
        primaryListingId: value.primaryListingId,
      };
    })
    .sort((a, b) => {
      const aIsAgibot = a.model.toLowerCase().startsWith("agibot") ? 0 : 1;
      const bIsAgibot = b.model.toLowerCase().startsWith("agibot") ? 0 : 1;

      if (aIsAgibot !== bIsAgibot) {
        return aIsAgibot - bIsAgibot;
      }

      return a.dayPrice - b.dayPrice;
    });
}

export function getRobotTypeBySlug(
  listings: safeListing[],
  modelSlug: string
): RobotTypeCardData | null {
  const catalog = buildRobotTypeCatalog(listings);
  const normalizedSlug = normalizeRobotText(modelSlug.replace(/-/g, " "));

  const match = catalog.find(
    (item) => normalizeRobotText(item.model) === normalizedSlug
  );

  return match ?? null;
}
