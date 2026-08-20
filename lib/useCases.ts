/**
 * Robot *capability* tags, stored on `RobotModel.useCase`. These describe what
 * a machine can physically do and are used to filter the internal robot
 * catalog — they are NOT service categories and never appear as customer-facing
 * taxonomy. The customer-facing taxonomy is the eight scenarios in
 * `lib/serviceCategories.ts`.
 */
export const USE_CASES = [
  "Cleaning",
  "Delivery",
  "Performance",
  "Guide",
  "Live streaming",
  "Patrol",
] as const;

export type UseCase = (typeof USE_CASES)[number];

export function isUseCase(value: unknown): value is UseCase {
  return typeof value === "string" && (USE_CASES as readonly string[]).includes(value);
}

/**
 * Fallback used when a provider does not pick a service scenario explicitly:
 * maps a robot's primary capability onto the closest of the eight scenarios.
 */
const CAPABILITY_TO_CATEGORY: Record<UseCase, string> = {
  Cleaning: "Warehouses",
  Delivery: "Restaurants",
  Performance: "Entertainment",
  Guide: "Hotels",
  "Live streaming": "Entertainment",
  Patrol: "Warehouses",
};

export function defaultCategoryForUseCases(useCases: string[]): string {
  for (const useCase of useCases) {
    if (isUseCase(useCase)) {
      return CAPABILITY_TO_CATEGORY[useCase];
    }
  }

  return "Commercial Events";
}
