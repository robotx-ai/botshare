"use client";

import useSearchModal from "@/hook/useSearchModal";
import { differenceInDays } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { BiSearch } from "react-icons/bi";

type Props = {
  transparent?: boolean;
};

function Search({ transparent = false }: Props) {
  const searchModel = useSearchModal();
  const params = useSearchParams();

  const zipCode = params?.get("zipCode");
  const startDate = params?.get("startDate");
  const endDate = params?.get("endDate");

  const locationLabel = useMemo(() => {
    return zipCode ? zipCode : "Any Area";
  }, [zipCode]);

  const durationLabel = useMemo(() => {
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      let diff = differenceInDays(end, start);

      if (diff === 0) {
        diff = 1;
      }

      return `${diff} Days`;
    }

    return "Any Dates";
  }, [startDate, endDate]);

  return (
    <div
      onClick={searchModel.onOpen}
      className={`border-[1px] w-full md:w-auto py-2 rounded-full transition cursor-pointer ${
        transparent
          ? "border-white/60 hover:border-white"
          : "shadow-sm hover:shadow-md border-neutral-200"
      }`}
    >
      <div className="flex flex-row items-center justify-between">
        <div className={`text-sm font-semibold px-6 ${transparent ? "text-white" : ""}`}>
          {locationLabel}
        </div>
        <div className={`hidden sm:block text-losm font-semibold px-6 border-x-[1px] flex-1 text-center ${transparent ? "border-white/40 text-white" : ""}`}>
          {durationLabel}
        </div>
        <div className="text-sm px-2 flex flex-row items-center">
          <div className={`rounded-full p-2 ${transparent ? "bg-white text-black" : "bg-black text-white"}`}>
            <BiSearch size={18} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Search;
