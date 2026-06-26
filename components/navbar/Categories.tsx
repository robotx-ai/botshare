"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { USE_CASE_META } from "@/lib/useCases";
import CategoryBox from "../CategoryBox";
import Container from "../Container";

// Exported for reuse (e.g. any consumer importing `categories`).
export const categories = USE_CASE_META;

type Props = {};

function Categories({}: Props) {
  const params = useSearchParams();
  const category = params?.get("category");
  const pathname = usePathname();

  if (pathname !== "/services") {
    return null;
  }

  return (
    <Container>
      <div className="pt-3 pb-1 flex flex-row items-center justify-center gap-3 overflow-x-auto">
        {categories.map((item) => (
          <CategoryBox
            key={item.label}
            icon={item.icon}
            label={item.label}
            selected={category === item.label}
          />
        ))}
      </div>
    </Container>
  );
}

export default Categories;
