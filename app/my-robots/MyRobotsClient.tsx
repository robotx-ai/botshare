"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import useIndividualRentModal from "@/hook/useIndividualRentModal";
import { individualEarningsCopy } from "@/lib/individualListing";
import { SafeUser, safeListing } from "@/types";

type Props = {
  robots: safeListing[];
  currentUser?: SafeUser | null;
};

function statusLabel(robot: safeListing): string {
  if (robot.status === "CLAIMED") {
    return robot.operatorName ? `Live · operated by ${robot.operatorName}` : "Live";
  }
  return "Available — waiting for an operator";
}

function MyRobotsClient({ robots, currentUser }: Props) {
  const individualModal = useIndividualRentModal();

  return (
    <Container>
      <div className="flex flex-col gap-2">
        <Heading title="My robots" subtitle={individualEarningsCopy()} />
        <button
          onClick={individualModal.onOpen}
          className="self-start rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          List a robot
        </button>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
        {robots.map((robot) => (
          <div key={robot.id} className="flex flex-col gap-2">
            <ListingCard data={robot} currentUser={currentUser} />
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-center text-xs font-medium text-neutral-800">
              {statusLabel(robot)}
            </span>
          </div>
        ))}
      </div>
    </Container>
  );
}

export default MyRobotsClient;
