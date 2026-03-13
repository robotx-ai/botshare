import scenarios from "@/data/agibot-scenarios.json";

export type AgibotScenarioRow = {
  tierLabel: "Silver" | "Gold" | "Platinum";
  robot: string;
  hours: number;
  features: string[];
};

export type AgibotScenarioDetails = {
  overview: string;
  rows: AgibotScenarioRow[];
};

type ScenarioTier = {
  robot: string;
  hours: number;
  features: string[];
};

type Scenario = {
  title: string;
  description: string;
  tiers: {
    silver: ScenarioTier;
    gold: ScenarioTier;
    platinum: ScenarioTier;
  };
};

const scenarioList = scenarios as Scenario[];

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/^agibot\s+/, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findScenarioByListingTitle(listingTitle: string): Scenario | null {
  const normalizedListingTitle = normalizeTitle(listingTitle);
  if (!normalizedListingTitle) {
    return null;
  }

  const exact = scenarioList.find(
    (scenario) => normalizeTitle(scenario.title) === normalizedListingTitle
  );

  if (exact) {
    return exact;
  }

  const partial = scenarioList.find((scenario) =>
    normalizedListingTitle.includes(normalizeTitle(scenario.title))
  );

  return partial ?? null;
}

export function getAgibotScenarioDetails(
  listingTitle: string
): AgibotScenarioDetails | null {
  if (!/^agibot\s+/i.test(listingTitle)) {
    return null;
  }

  const scenario = findScenarioByListingTitle(listingTitle);
  if (!scenario) {
    return null;
  }

  return {
    overview: scenario.description,
    rows: [
      {
        tierLabel: "Silver",
        robot: scenario.tiers.silver.robot,
        hours: scenario.tiers.silver.hours,
        features: scenario.tiers.silver.features,
      },
      {
        tierLabel: "Gold",
        robot: scenario.tiers.gold.robot,
        hours: scenario.tiers.gold.hours,
        features: scenario.tiers.gold.features,
      },
      {
        tierLabel: "Platinum",
        robot: scenario.tiers.platinum.robot,
        hours: scenario.tiers.platinum.hours,
        features: scenario.tiers.platinum.features,
      },
    ],
  };
}
