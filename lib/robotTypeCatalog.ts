import { safeListing } from "@/types";
import {
  getRobotModelFromListing,
  normalizeRobotText,
  slugifyRobotModel,
} from "./robotModel";

const CLD = "https://res.cloudinary.com/dmrhtzqyx/image/upload/q_auto,f_auto";

const ROBOT_TYPE_IMAGES: Record<string, string> = {
  "AGIBOT D1 Edu": `${CLD}/listing-agibot-d1-edu`,
};

const ROBOT_TYPE_DAY_PRICES: Record<string, number> = {
  "AGIBOT G2": 450,
  "AGIBOT A2": 580,
  "AGIBOT X2": 300,
  "AGIBOT X2 Ultra": 500,
  "AGIBOT A2 Lite": 500,
  "AGIBOT A2 Ultra": 800,
  "AGIBOT D1 Edu": 100,
  "AGIBOT D1 Ultra": 200,
};

export type RobotTypeCardData = {
  model: string;
  modelSlug: string;
  imageSrc: string;
  categories: string[];
  dayPrice: number;
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

  const agibotListings = listings.filter((l) => /^agibot\s+/i.test(l.title));

  for (const listing of agibotListings) {
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
      return {
        model,
        modelSlug: slugifyRobotModel(model),
        imageSrc: ROBOT_TYPE_IMAGES[model] ?? value.imageSrc,
        categories: Array.from(value.categories).sort(),
        dayPrice: ROBOT_TYPE_DAY_PRICES[model] ?? value.dayPrice,
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
