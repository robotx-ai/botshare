// Single source of truth for the order lifecycle. The status names below MUST
// stay identical to the Prisma `OrderStatus` enum in prisma/schema.prisma.

export const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "RETURN_INITIATED",
  "RETURN_RECEIVED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// The 7 happy-path steps in order (CANCELLED is a side-exit, not a step).
export const ORDER_STEPS: OrderStatus[] = [
  "PLACED",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "RETURN_INITIATED",
  "RETURN_RECEIVED",
  "COMPLETED",
];

export const TERMINAL_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELLED"];

// Customer-facing labels (BotShare terminology).
export const STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: "Order placed",
  CONFIRMED: "Confirmed by operator",
  SHIPPED: "On the way to you",
  DELIVERED: "Delivered — you have it",
  RETURN_INITIATED: "Return shipped back",
  RETURN_RECEIVED: "Return received — verifying",
  COMPLETED: "Completed & settled",
  CANCELLED: "Cancelled",
};

export type OrderRole = "customer" | "provider" | "admin";

type TransitionRule = {
  from: OrderStatus;
  to: OrderStatus;
  roles: OrderRole[];
};

// The complete, explicit transition table. Anything not listed is illegal.
export const TRANSITIONS: TransitionRule[] = [
  { from: "PLACED", to: "CONFIRMED", roles: ["provider", "admin"] },
  { from: "CONFIRMED", to: "SHIPPED", roles: ["provider", "admin"] },
  { from: "SHIPPED", to: "DELIVERED", roles: ["customer", "admin"] },
  { from: "DELIVERED", to: "RETURN_INITIATED", roles: ["customer", "admin"] },
  { from: "RETURN_INITIATED", to: "RETURN_RECEIVED", roles: ["provider", "admin"] },
  { from: "RETURN_RECEIVED", to: "COMPLETED", roles: ["provider", "admin"] },
  // Cancel: customer/provider only before the robot ships; admin while non-terminal.
  { from: "PLACED", to: "CANCELLED", roles: ["customer", "provider", "admin"] },
  { from: "CONFIRMED", to: "CANCELLED", roles: ["customer", "provider", "admin"] },
  { from: "SHIPPED", to: "CANCELLED", roles: ["admin"] },
  { from: "DELIVERED", to: "CANCELLED", roles: ["admin"] },
  { from: "RETURN_INITIATED", to: "CANCELLED", roles: ["admin"] },
  { from: "RETURN_RECEIVED", to: "CANCELLED", roles: ["admin"] },
];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export function nextHappyStatus(from: OrderStatus): OrderStatus | null {
  const idx = ORDER_STEPS.indexOf(from);
  if (idx === -1 || idx === ORDER_STEPS.length - 1) return null;
  return ORDER_STEPS[idx + 1];
}

export function resolveOrderRole(input: {
  currentUserId: string;
  customerId: string;
  providerId: string;
  isAdmin: boolean;
}): OrderRole | null {
  if (input.isAdmin) return "admin";
  if (input.currentUserId === input.customerId) return "customer";
  if (input.currentUserId === input.providerId) return "provider";
  return null;
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: OrderRole
): boolean {
  const rule = TRANSITIONS.find((t) => t.from === from && t.to === to);
  return !!rule && rule.roles.includes(role);
}
