import type { IconType } from "react-icons";
import {
  FaBroom,
  FaTruck,
  FaTheaterMasks,
  FaUserTie,
  FaVideo,
  FaShieldAlt,
} from "react-icons/fa";

export const USE_CASES = [
  "Cleaning",
  "Delivery",
  "Performance",
  "Guide",
  "Live streaming",
  "Patrol",
] as const;

export type UseCase = (typeof USE_CASES)[number];

export function isUseCase(value: unknown): value is UseCase {
  return typeof value === "string" && (USE_CASES as readonly string[]).includes(value);
}

export const USE_CASE_META: { label: UseCase; icon: IconType; description: string }[] = [
  { label: "Cleaning", icon: FaBroom, description: "Robots for recurring cleaning and facility upkeep." },
  { label: "Delivery", icon: FaTruck, description: "Robots that move goods and orders between points." },
  { label: "Performance", icon: FaTheaterMasks, description: "Robots for demos, events, and live performance." },
  { label: "Guide", icon: FaUserTie, description: "Reception, showroom, and visitor-guidance robots." },
  { label: "Live streaming", icon: FaVideo, description: "Robots for live broadcast and remote presence." },
  { label: "Patrol", icon: FaShieldAlt, description: "Robots for patrol, inspection, and outdoor coverage." },
];
