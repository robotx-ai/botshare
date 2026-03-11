import scenarios from "@/data/agibot-scenarios.json";

export type ScenarioPricing = { silver: number; gold: number; platinum: number };

export function getScenarioPricing(title: string): ScenarioPricing | null {
  const match = scenarios.find(
    (s) => title.startsWith(s.id) || title.includes(s.title)
  );
  return match ? match.pricing : null;
}
