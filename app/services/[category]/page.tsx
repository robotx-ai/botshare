import { notFound } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import ScenarioHero from "@/components/services/ScenarioHero";
import ScenarioDetail from "@/components/services/ScenarioDetail";
import ServiceResults from "@/components/services/ServiceResults";
import { SERVICE_CATEGORY_META } from "@/lib/serviceCategories";
import { getScenario } from "@/lib/serviceScenarios";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings, { IListingsParams } from "@/app/actions/getListings";

export const dynamic = "force-dynamic";

interface ScenarioPageProps {
  params: { category: string };
  searchParams: Omit<IListingsParams, "category">;
}

export function generateStaticParams() {
  return SERVICE_CATEGORY_META.map(({ slug }) => ({ category: slug }));
}

export function generateMetadata({ params }: ScenarioPageProps) {
  const scenario = getScenario(params.category);

  if (!scenario) {
    return { title: "Service Solutions — Hifivebot" };
  }

  return {
    title: `${scenario.label} — Hifivebot`,
    description: scenario.lede,
  };
}

export default async function ScenarioPage({
  params,
  searchParams,
}: ScenarioPageProps) {
  const scenario = getScenario(params.category);

  if (!scenario) {
    notFound();
  }

  const [listings, currentUser] = await Promise.all([
    getListings({ ...searchParams, category: scenario.label }),
    getCurrentUser(),
  ]);

  const fromPrice = listings.length
    ? Math.min(...listings.map((listing) => listing.price))
    : undefined;

  return (
    <>
      <ScenarioHero
        scenario={scenario}
        packageCount={listings.length}
        fromPrice={fromPrice}
      />
      <ClientOnly>
        <ServiceResults
          title={`${scenario.label} packages`}
          subtitle={`Bookable service packages for ${scenario.label.toLowerCase()}. Prices are per day and include one on-site operator per active robot.`}
          listings={listings}
          currentUser={currentUser}
          activeSlug={scenario.slug}
          emptyTitle={`No ${scenario.label.toLowerCase()} packages in this area yet`}
          emptySubtitle="Widen the coverage area or dates in search, or pick another scenario below."
        />
      </ClientOnly>
      <ScenarioDetail scenario={scenario} />
    </>
  );
}
