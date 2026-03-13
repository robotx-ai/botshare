import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import Heading from "@/components/Heading";
import getListings from "@/app/actions/getListings";
import { buildRobotTypeCatalog } from "@/lib/robotTypeCatalog";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RobotTypesPage() {
  const listings = await getListings({});
  const robotTypes = buildRobotTypeCatalog(listings);

  if (robotTypes.length === 0) {
    return (
      <ClientOnly>
        <EmptyState
          title="No robot types found"
          subtitle="Please check back soon for available robot services."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <Container>
        <div className="pt-10 md:pt-16">
          <Heading
            title="Browse Robot Types"
            subtitle="Compare robot models by 4-hour and per-day pricing. Per-day booking gives the best value for longer deployments."
          />
        </div>

        <div className="pt-10 grid grid-cols-1 gap-8 overflow-x-hidden sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
          {robotTypes.map((robot) => (
            <div
              key={robot.model}
              className="col-span-1 mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-neutral-200 bg-white"
            >
              <div className="aspect-square w-full relative overflow-hidden bg-neutral-100">
                <Image
                  fill
                  src={robot.imageSrc}
                  alt={robot.model}
                  className="object-contain p-3"
                />
              </div>

              <div className="flex flex-col gap-4 p-5">
                <div>
                  <p className="text-xl font-bold text-black">{robot.model}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Single Type Deal · {robot.listingCount} service package
                    {robot.listingCount > 1 ? "s" : ""} available
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {robot.categories.map((category) => (
                    <span
                      key={`${robot.model}-${category}`}
                      className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700"
                    >
                      {category}
                    </span>
                  ))}
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">From 4 hours</span>
                    <span className="font-semibold text-black">
                      ${robot.fourHourPrice}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-base">
                    <span className="font-semibold text-black">Per day</span>
                    <span className="text-xl font-bold text-black">
                      ${robot.dayPrice}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    Per-day booking saves about {robot.dailySavingsPercent}% vs
                    six separate 4-hour blocks.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={`/robot-types/${robot.modelSlug}`}
                    className="rounded-lg bg-black px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Book by type
                  </Link>
                  <Link
                    href={{
                      pathname: "/services",
                      query: { robotModel: robot.model },
                    }}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                  >
                    View bundle deals
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </ClientOnly>
  );
}
