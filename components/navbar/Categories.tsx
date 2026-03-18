"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  FaRobot,
  FaWarehouse,
  FaUtensils,
} from "react-icons/fa";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";
import CategoryBox from "../CategoryBox";
import Container from "../Container";

export const categories = [
  {
    label: SERVICE_CATEGORIES[0],
    icon: FaRobot,
    description: "Robots for demos, events, and live performance experiences.",
  },
  {
    label: SERVICE_CATEGORIES[1],
    icon: FaWarehouse,
    description: "Automation support for warehouse operations and workflows.",
  },
  {
    label: SERVICE_CATEGORIES[2],
    icon: FaUtensils,
    description: "Service robots for restaurant operations and customer service.",
  },
];

type Props = {};

function Categories({}: Props) {
  const params = useSearchParams();
  const category = params?.get("category");
  const pathname = usePathname();

  const isServicesPage = pathname === "/services";

  if (!isServicesPage) {
    return null;
  }

  return (
    <Container>
      <div className="pt-3 pb-1 flex flex-row items-center justify-center gap-3 overflow-x-auto">
        {categories.map((items) => (
          <CategoryBox
            key={items.label}
            icon={items.icon}
            label={items.label}
            selected={category === items.label}
          />
        ))}
      </div>
    </Container>
  );
}

export default Categories;
