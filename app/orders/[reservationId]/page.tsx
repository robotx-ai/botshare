import { notFound, redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getOrderById from "@/app/actions/getOrderById";
import { isAdminEmail } from "@/lib/adminAuth";
import { resolveOrderRole } from "@/lib/orderStatus";
import ClientOnly from "@/components/ClientOnly";
import OrderStatusClient from "./OrderStatusClient";

type Props = { params: { reservationId: string } };

export default async function OrderDetailPage({ params }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/");

  const order = await getOrderById(params.reservationId, currentUser);
  if (!order) notFound();

  const role = resolveOrderRole({
    currentUserId: currentUser.id,
    customerId: order.userId,
    providerId: order.providerId,
    isAdmin: isAdminEmail(currentUser.email),
  });
  if (!role) notFound();

  return (
    <ClientOnly>
      <OrderStatusClient order={order} role={role} />
    </ClientOnly>
  );
}
