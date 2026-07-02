"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import { SafeUser, safeListing } from "@/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";

type Props = {
  robots: safeListing[];
  currentUser?: SafeUser | null;
};

function AvailableRobotsClient({ robots, currentUser }: Props) {
  const router = useRouter();
  const [claimingId, setClaimingId] = useState("");

  const onClaim = useCallback(
    (id: string) => {
      const zipCode = window.prompt("Enter the 5-digit zip code where you'll operate this robot:");
      if (!zipCode) return;
      setClaimingId(id);
      axios
        .post(`/api/listings/${id}/claim`, { zipCode })
        .then(() => {
          toast.success("Robot claimed — it's now live for customers.");
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error ?? "Could not claim this robot.");
        })
        .finally(() => setClaimingId(""));
    },
    [router]
  );

  return (
    <Container>
      <Heading
        title="Available robots"
        subtitle="Robots listed by individuals. Claim one to operate it for nearby customers."
      />
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
        {robots.map((robot) => (
          <ListingCard
            key={robot.id}
            data={robot}
            actionId={robot.id}
            onAction={onClaim}
            disabled={claimingId === robot.id}
            actionLabel="List this robot"
            currentUser={currentUser}
          />
        ))}
      </div>
    </Container>
  );
}

export default AvailableRobotsClient;
