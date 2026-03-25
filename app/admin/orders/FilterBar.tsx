"use client";

type Props = {
  search: string;
  category: string;
  startDate: string;
  endDate: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "Showcase & Performance", label: "Showcase & Performance" },
  { value: "Warehouse", label: "Warehouse" },
  { value: "Restaurant", label: "Restaurant" },
];

export default function FilterBar({
  search,
  category,
  startDate,
  endDate,
  onSearchChange,
  onCategoryChange,
  onStartDateChange,
  onEndDateChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <input
        type="text"
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 min-w-[200px]"
      />
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
    </div>
  );
}
