"use client";

import { SafeAdminReservation } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import FilterBar from "./FilterBar";
import OrdersTable from "./OrdersTable";

type Props = {
  reservations: SafeAdminReservation[];
};

export default function OrdersClient({ reservations }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams?.get("search") ?? "";
  const category = searchParams?.get("category") ?? "";
  const startDate = searchParams?.get("startDate") ?? "";
  const endDate = searchParams?.get("endDate") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/admin/orders?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <>
      <FilterBar
        search={search}
        category={category}
        startDate={startDate}
        endDate={endDate}
        onSearchChange={(v) => updateParam("search", v)}
        onCategoryChange={(v) => updateParam("category", v)}
        onStartDateChange={(v) => updateParam("startDate", v)}
        onEndDateChange={(v) => updateParam("endDate", v)}
      />
      <OrdersTable reservations={reservations} />
    </>
  );
}
