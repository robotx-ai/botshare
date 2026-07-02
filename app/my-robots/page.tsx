import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import getCurrentUser from "../actions/getCurrentUser";
import getMyRobots from "../actions/getMyRobots";
import MyRobotsClient from "./MyRobotsClient";

const MyRobotsPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }

  const robots = await getMyRobots(currentUser.id);

  if (robots.length === 0) {
    return (
      <ClientOnly>
        <EmptyState
          title="No robots listed yet"
          subtitle="List your robot and an operator can pick it up for you."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <MyRobotsClient robots={robots} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default MyRobotsPage;
