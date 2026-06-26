import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import getCurrentUser from "../actions/getCurrentUser";
import ProfileClient from "./ProfileClient";

const ProfilePage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login to view your profile." />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <ProfileClient currentUser={currentUser} />
    </ClientOnly>
  );
};

export default ProfilePage;
