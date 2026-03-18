export const SERVICE_CATEGORIES = [
  "Showcase & Performance",
  "Warehouse",
  "Restaurant",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export function isServiceCategory(
  value: unknown
): value is ServiceCategory {
  if (typeof value !== "string") {
    return false;
  }

  return (SERVICE_CATEGORIES as readonly string[]).includes(value);
}
