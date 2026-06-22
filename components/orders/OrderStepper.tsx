import { ORDER_STEPS, STATUS_LABELS, type OrderStatus } from "@/lib/orderStatus";
import { SafeReservationEvent } from "@/types";

type Props = {
  status: OrderStatus;
  events: SafeReservationEvent[];
};

function formatTs(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OrderStepper({ status, events }: Props) {
  const eventByStatus = new Map(events.map((e) => [e.status, e]));
  const isCancelled = status === "CANCELLED";
  const currentIndex = ORDER_STEPS.indexOf(status);

  return (
    <ol className="flex flex-col">
      {ORDER_STEPS.map((step, i) => {
        const done = !isCancelled && i <= currentIndex;
        const isCurrent = !isCancelled && i === currentIndex;
        const evt = eventByStatus.get(step);
        return (
          <li key={step} className="flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  done
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-400 border-gray-300",
                ].join(" ")}
              >
                {i + 1}
              </span>
              {i < ORDER_STEPS.length - 1 && (
                <span
                  className={`mt-1 w-px flex-1 ${done ? "bg-black" : "bg-gray-200"}`}
                />
              )}
            </div>
            <div className="pt-0.5">
              <div
                className={`text-sm font-medium ${
                  done ? "text-gray-900" : "text-gray-400"
                } ${isCurrent ? "underline" : ""}`}
              >
                {STATUS_LABELS[step]}
              </div>
              {evt && (
                <div className="text-xs text-gray-500">
                  {formatTs(evt.createdAt)}
                  {evt.actorName ? ` · ${evt.actorName}` : ""}
                </div>
              )}
            </div>
          </li>
        );
      })}
      {isCancelled && (
        <li className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
          {STATUS_LABELS.CANCELLED}
        </li>
      )}
    </ol>
  );
}
