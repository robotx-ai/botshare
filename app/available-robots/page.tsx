import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import { canManageServices } from "@/lib/adminAuth";
import getCurrentUser from "../actions/getCurrentUser";
import getAvailableRobots from "../actions/getAvailableRobots";
import AvailableRobotsClient from "./AvailableRobotsClient";

const AvailableRobotsPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }

  if (!canManageServices(currentUser)) {
    return (
      <ClientOnly>
        <EmptyState
          title="Access required"
          subtitle="Only service operators and admins can claim robots."
        />
      </ClientOnly>
    );
  }

  const robots = await getAvailableRobots();

  if (robots.length === 0) {
    return (
      <ClientOnly>
        <EmptyState
          title="No robots available"
          subtitle="No individuals have listed a robot for pickup yet."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <AvailableRobotsClient robots={robots} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default AvailableRobotsPage;
