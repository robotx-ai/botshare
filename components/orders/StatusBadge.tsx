import { OrderStatus, STATUS_LABELS } from "@/lib/orderStatus";

const TONE: Record<OrderStatus, string> = {
  PLACED: "bg-gray-100 text-gray-700 border-gray-200",
  CONFIRMED: "bg-gray-100 text-gray-700 border-gray-200",
  SHIPPED: "bg-gray-200 text-gray-800 border-gray-300",
  DELIVERED: "bg-gray-200 text-gray-800 border-gray-300",
  RETURN_INITIATED: "bg-gray-200 text-gray-800 border-gray-300",
  RETURN_RECEIVED: "bg-gray-200 text-gray-800 border-gray-300",
  COMPLETED: "bg-black text-white border-black",
  CANCELLED: "bg-white text-gray-400 border-gray-200 line-through",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
