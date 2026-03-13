import scenarios from "@/data/agibot-scenarios.json";
import { safeListing } from "@/types";

type Scenario = {
  title: string;
  primaryRobot: string;
};

const scenarioList = scenarios as Scenario[];

export function normalizeRobotText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyRobotModel(model: string): string {
  return normalizeRobotText(model).replace(/\s+/g, "-");
}

function getScenarioRobotByListingTitle(listingTitle: string): string | null {
  const stripped = listingTitle.replace(/^agibot\s+/i, "").trim();
  const normalized = normalizeRobotText(stripped);
  const match = scenarioList.find(
    (scenario) => normalizeRobotText(scenario.title) === normalized
  );
  return match?.primaryRobot ?? null;
}

export function getRobotModelFromListing(listing: safeListing): string {
  if (/^agibot\s+/i.test(listing.title)) {
    return getScenarioRobotByListingTitle(listing.title) ?? "AGIBot";
  }

  const [modelPart] = listing.title.split("—");
  return modelPart?.trim() || listing.title.trim();
}

export function matchesRobotModel(listing: safeListing, robotModel: string): boolean {
  return (
    normalizeRobotText(getRobotModelFromListing(listing)) ===
    normalizeRobotText(robotModel)
  );
}
