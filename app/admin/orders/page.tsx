import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import { isAdminEmail } from "@/lib/adminAuth";
import getAllReservations from "@/app/actions/getAllReservations";
import getCurrentUser from "@/app/actions/getCurrentUser";
import OrdersClient from "./OrdersClient";

interface Props {
  searchParams: {
    search?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  };
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const currentUser = await getCurrentUser();

  // Level 1: defensive fallback (middleware handles unauthenticated users first)
  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }

  // Level 2: real admin gate — logged-in non-admins are blocked here
  if (!isAdminEmail(currentUser.email)) {
    return (
      <ClientOnly>
        <EmptyState
          title="Admin access required"
          subtitle="Only admins can view rental orders."
        />
      </ClientOnly>
    );
  }

  const reservations = await getAllReservations({
    search: searchParams.search,
    category: searchParams.category,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
  });

  return (
    <ClientOnly>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Rental Orders</h1>
        <p className="text-sm text-gray-500 mb-6">Manage all service bookings</p>
        <OrdersClient reservations={reservations} />
      </div>
    </ClientOnly>
  );
}
