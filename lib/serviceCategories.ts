import type { IconType } from "react-icons";
import {
  MdCelebration,
  MdBusinessCenter,
  MdSchool,
  MdTheaterComedy,
  MdRestaurant,
  MdHotel,
  MdStorefront,
  MdWarehouse,
} from "react-icons/md";

/**
 * The eight canonical Hifivebot service scenarios. This is the *only* service
 * taxonomy: `Listing.category` must hold one of these labels, and every
 * customer-facing filter, route, and chip is derived from this list.
 *
 * `RobotModel.useCase` is a separate, internal robot-capability vocabulary
 * (see `lib/useCases.ts`) — it is not a service category.
 */
export const SERVICE_CATEGORIES = [
  "Private Events",
  "Commercial Events",
  "Schools & Universities",
  "Entertainment",
  "Restaurants",
  "Hotels",
  "Shopping Centers",
  "Warehouses",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export type ServiceCategorySlug =
  | "private-events"
  | "commercial-events"
  | "schools-universities"
  | "entertainment"
  | "restaurants"
  | "hotels"
  | "shopping-centers"
  | "warehouses";

export type ServiceCategoryMeta = {
  slug: ServiceCategorySlug;
  label: ServiceCategory;
  icon: IconType;
  /** One-line scenario summary — used on cards, chips, and listing detail. */
  description: string;
};

export const SERVICE_CATEGORY_META: ServiceCategoryMeta[] = [
  {
    slug: "private-events",
    label: "Private Events",
    icon: MdCelebration,
    description:
      "Robot interaction, dance and photo services for privately hosted gatherings.",
  },
  {
    slug: "commercial-events",
    label: "Commercial Events",
    icon: MdBusinessCenter,
    description:
      "Robot performance and interaction services for trade shows, product launches, annual meetings and brand events.",
  },
  {
    slug: "schools-universities",
    label: "Schools & Universities",
    icon: MdSchool,
    description:
      "Robot demonstrations and themed programs for schools, universities, science centers and museums.",
  },
  {
    slug: "entertainment",
    label: "Entertainment",
    icon: MdTheaterComedy,
    description:
      "Robot interaction, dance and photo services for stages, nightlife venues and live shows.",
  },
  {
    slug: "restaurants",
    label: "Restaurants",
    icon: MdRestaurant,
    description:
      "Robot greeting, scheduled performance and photo services for restaurant entrances, waiting areas and celebration programs.",
  },
  {
    slug: "hotels",
    label: "Hotels",
    icon: MdHotel,
    description:
      "Robot greeting, scheduled performance and themed interaction services for hotel lobbies and public areas.",
  },
  {
    slug: "shopping-centers",
    label: "Shopping Centers",
    icon: MdStorefront,
    description:
      "Robot performance, greeting and photo services for shopping-center atriums, entrances and retail activity areas.",
  },
  {
    slug: "warehouses",
    label: "Warehouses",
    icon: MdWarehouse,
    description:
      "Site assessment and supervised robot pilots for clearly defined warehouse and production tasks.",
  },
];

export function isServiceCategory(value: unknown): value is ServiceCategory {
  if (typeof value !== "string") {
    return false;
  }

  return (SERVICE_CATEGORIES as readonly string[]).includes(value);
}

export function getCategoryMeta(
  label: string
): ServiceCategoryMeta | undefined {
  return SERVICE_CATEGORY_META.find((meta) => meta.label === label);
}

export function getCategoryMetaBySlug(
  slug: string
): ServiceCategoryMeta | undefined {
  return SERVICE_CATEGORY_META.find((meta) => meta.slug === slug);
}

export function categorySlug(label: string): ServiceCategorySlug | undefined {
  return getCategoryMeta(label)?.slug;
}

/** `/services/private-events` — the canonical link for a scenario. */
export function categoryHref(label: string): string {
  const slug = categorySlug(label);
  return slug ? `/services/${slug}` : "/services";
}
