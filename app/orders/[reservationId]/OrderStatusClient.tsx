"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import {
  canTransition,
  nextHappyStatus,
  type OrderRole,
  type OrderStatus,
} from "@/lib/orderStatus";
import { SafeOrderDetail } from "@/types";
import OrderStepper from "@/components/orders/OrderStepper";
import StatusBadge from "@/components/orders/StatusBadge";

// Button copy keyed by the CURRENT status (the action moves it forward).
const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  PLACED: "Confirm booking",
  CONFIRMED: "Mark as shipped",
  SHIPPED: "Confirm delivery",
  DELIVERED: "Mark as returned",
  RETURN_INITIATED: "Confirm return received",
  RETURN_RECEIVED: "Verify & complete",
};

type Props = {
  order: SafeOrderDetail;
  role: OrderRole;
};

export default function OrderStatusClient({ order, role }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const status = order.status;

  const next = nextHappyStatus(status);
  const canAdvance = !!next && canTransition(status, next, role);
  const canCancel = canTransition(status, "CANCELLED", role);

  const patch = async (to: OrderStatus, successMsg: string) => {
    setBusy(true);
    try {
      await axios.patch(`/api/reservations/${order.id}/status`, { status: to });
      toast.success(successMsg);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {order.listing.title}
          </h1>
          <p className="text-sm text-gray-500">Order #{order.id.slice(-8)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="rounded-xl border border-gray-200 p-6">
        <OrderStepper status={status} events={order.events} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {canAdvance && next && (
          <button
            disabled={busy}
            onClick={() => patch(next, "Status updated")}
            className="rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? "Updating…" : ADVANCE_LABEL[status]}
          </button>
        )}
        {canCancel && (
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm("Cancel this booking?"))
                patch("CANCELLED", "Booking cancelled");
            }}
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel booking
          </button>
        )}
      </div>
    </div>
  );
}
