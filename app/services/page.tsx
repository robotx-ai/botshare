import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import getCurrentUser from "../actions/getCurrentUser";
import getListings, { IListingsParams } from "../actions/getListings";

export const dynamic = 'force-dynamic';

interface ServicesProps {
  searchParams: IListingsParams;
}

export default async function ServicesPage({ searchParams }: ServicesProps) {
  const listing = await getListings(searchParams);
  const currentUser = await getCurrentUser();

  if (listing.length === 0) {
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
            title="Explore Services"
            subtitle="Browse RobotX service packages by category, coverage area, and booking dates."
          />
        </div>
        <div className="pt-10 grid grid-cols-1 gap-8 overflow-x-hidden sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
          {listing.map((list) => {
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
