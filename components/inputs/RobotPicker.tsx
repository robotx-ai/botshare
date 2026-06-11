"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import useRobotModels, { RobotModelOption } from "@/hook/useRobotModels";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";

type Props = {
  selectedId: string | null;
  onSelect: (robot: RobotModelOption | null) => void;
};

// Every query token must appear somewhere in name + brand + model.
function matches(robot: RobotModelOption, query: string) {
  const haystack = `${robot.productName} ${robot.brand} ${robot.model}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((tok) => haystack.includes(tok));
}

function RobotPicker({ selectedId, onSelect }: Props) {
  const { robots, loading, error } = useRobotModels(true);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const brands = useMemo(
    () => Array.from(new Set(robots.map((r) => r.brand))).sort(),
    [robots]
  );

  const results = useMemo(
    () =>
      robots.filter(
        (r) =>
          (!query || matches(r, query)) &&
          (!brand || r.brand === brand) &&
          (!category || r.serviceCategory === category)
      ),
    [robots, query, brand, category]
  );

  const chip = (active: boolean) =>
    `px-3 py-1 rounded-full text-sm border transition ${
      active
        ? "bg-black text-white border-black"
        : "bg-white text-neutral-700 border-neutral-300 hover:border-black"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by model, brand, or name (e.g. G1, Pudu)"
        className="w-full p-3 font-light bg-white border-2 border-neutral-300 rounded-md outline-none focus:border-black transition"
      />

      <div className="flex flex-wrap gap-2">
        {SERVICE_CATEGORIES.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setCategory((prev) => (prev === c ? null : c))}
            className={chip(category === c)}
          >
            {c}
          </button>
        ))}
      </div>

      {brands.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <button
              type="button"
              key={b}
              onClick={() => setBrand((prev) => (prev === b ? null : b))}
              className={chip(brand === b)}
            >
              {b}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`text-left text-sm underline ${
          selectedId === null ? "text-black font-medium" : "text-neutral-500"
        }`}
      >
        Can&apos;t find it? Enter the details manually
      </button>

      <div className="max-h-[42vh] overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-gray-700">
        {loading && (
          <p className="text-sm text-neutral-500 py-6 text-center">Loading robots…</p>
        )}
        {error && (
          <p className="text-sm text-red-500 py-6 text-center">
            Couldn&apos;t load the catalog. You can still enter details manually above.
          </p>
        )}
        {!loading && !error && results.length === 0 && (
          <p className="text-sm text-neutral-500 py-6 text-center">
            No robots match — try another term or enter details manually.
          </p>
        )}

        {results.map((r) => {
          const active = r.id === selectedId;
          return (
            <button
              type="button"
              key={r.id}
              onClick={() => onSelect(r)}
              className={`flex items-center gap-3 p-2 rounded-md border text-left transition ${
                active
                  ? "border-black ring-1 ring-black bg-neutral-50"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <div className="relative h-14 w-14 flex-shrink-0 bg-neutral-100 rounded overflow-hidden">
                {r.imageUrl ? (
                  <Image
                    src={r.imageUrl}
                    alt={r.productName}
                    fill
                    sizes="56px"
                    className="object-contain"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
                    No image
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{r.productName}</p>
                <p className="text-xs text-neutral-500 truncate">
                  {r.brand} · {r.serviceCategory}
                </p>
              </div>
              {r.msrp != null && (
                <span className="text-xs text-neutral-400 flex-shrink-0">
                  MSRP ${r.msrp.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RobotPicker;
