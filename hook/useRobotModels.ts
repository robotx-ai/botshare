"use client";

import { useEffect, useState } from "react";

export type RobotModelOption = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  productName: string;
  description: string;
  msrp: number | null;
  serviceCategory: string;
  capabilityTag: string;
  imageUrl: string | null;
  priceHourly: number | null;
  priceDaily: number | null;
  priceMonthly: number | null;
  useCase: string[];
};

// Module-level cache: the ~98-row catalog is fetched once per session and
// reused across modal opens.
let cache: RobotModelOption[] | null = null;
let inflight: Promise<RobotModelOption[]> | null = null;

function load(): Promise<RobotModelOption[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/robot-models")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load catalog (${r.status})`);
        return r.json();
      })
      .then((data: RobotModelOption[]) => {
        cache = data;
        inflight = null;
        return data;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

type Result = {
  robots: RobotModelOption[];
  loading: boolean;
  error: boolean;
};

// Fetches the robot catalog when `enabled` (e.g. the modal is open).
export default function useRobotModels(enabled: boolean): Result {
  const [robots, setRobots] = useState<RobotModelOption[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || cache) return;
    let active = true;
    setLoading(true);
    setError(false);
    load()
      .then((data) => {
        if (active) {
          setRobots(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { robots, loading, error };
}
