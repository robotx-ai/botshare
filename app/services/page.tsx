import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import { matchesRobotModel } from "@/lib/robotModel";
import getCurrentUser from "../actions/getCurrentUser";
import getListings, { IListingsParams } from "../actions/getListings";

export const dynamic = 'force-dynamic';

interface ServicesProps {
  searchParams: IListingsParams;
}

export default async function ServicesPage({ searchParams }: ServicesProps) {
  const { robotModel, ...filters } = searchParams;
  const listing = await getListings(filters);
  const filteredListing =
    typeof robotModel === "string" && robotModel.trim().length > 0
      ? listing.filter((item) => matchesRobotModel(item, robotModel))
      : listing;
  const currentUser = await getCurrentUser();

  if (filteredListing.length === 0) {
    return (
      <ClientOnly>
        <EmptyState showReset />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <Container>
        <div className="pt-10 md:pt-16">
          <Heading
            title="Explore Bundle Deals"
            subtitle="Browse RobotX bundle service packages by category, coverage area, robot model, and booking dates."
          />
        </div>
        <div className="pt-10 grid grid-cols-1 gap-8 overflow-x-hidden sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
          {filteredListing.map((list) => {
            return (
              <ListingCard
                key={list.id}
                data={list}
                currentUser={currentUser}
              />
            );
          })}
        </div>
      </Container>
    </ClientOnly>
  );
}
