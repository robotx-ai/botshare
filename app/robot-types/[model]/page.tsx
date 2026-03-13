import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings from "@/app/actions/getListings";
import getReservation from "@/app/actions/getReservations";
import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import Heading from "@/components/Heading";
import RobotTypeBookingClient from "@/components/robot-types/RobotTypeBookingClient";
import { getRobotTypeBySlug } from "@/lib/robotTypeCatalog";
import Image from "next/image";
import Link from "next/link";

interface IParams {
  model?: string;
}

const RobotTypeDetailPage = async ({ params }: { params: IParams }) => {
  const listings = await getListings({});
  const modelSlug = params.model || "";
  const robotType = getRobotTypeBySlug(listings, modelSlug);

  if (!robotType) {
    return (
      <ClientOnly>
        <EmptyState
          title="Robot type not found"
          subtitle="Please select another robot type."
          showReset
        />
      </ClientOnly>
    );
  }

  const reservations = await getReservation({
    listingId: robotType.primaryListingId,
  });
  const currentUser = await getCurrentUser();

  return (
    <ClientOnly>
      <Container>
        <div className="mx-auto max-w-screen-lg pt-10 md:pt-16">
          <Heading
            title={robotType.model}
            subtitle="Single Type Deal booking. Choose 4 hours or per-day rental and confirm instantly."
          />

          <div className="mt-8 flex flex-col gap-6">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="relative h-72 w-full bg-neutral-100 md:h-[420px]">
                <Image
                  fill
                  src={robotType.imageSrc}
                  alt={robotType.model}
                  className="object-contain p-4"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Type of deal
              </p>
              <p className="mt-1 text-lg font-bold text-black">Single Type Deal</p>
              <p className="mt-1 text-sm text-neutral-600">
                Need scenario bundles, choreography, or event package add-ons?
              </p>
              <Link
                href={{
                  pathname: "/services",
                  query: { robotModel: robotType.model },
                }}
                className="mt-4 inline-block rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
              >
                View bundle deals for this model
              </Link>
            </div>

            <RobotTypeBookingClient
              model={robotType.model}
              dayPrice={robotType.dayPrice}
              fourHourPrice={robotType.fourHourPrice}
              listingId={robotType.primaryListingId}
              reservations={reservations}
              currentUser={currentUser}
            />
          </div>
        </div>
      </Container>
    </ClientOnly>
  );
};

export default RobotTypeDetailPage;
