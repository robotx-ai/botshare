"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  FaRobot,
  FaWarehouse,
  FaUtensils,
} from "react-icons/fa";
import { MdOutlineCleaningServices } from "react-icons/md";
import { ROBOTX_SERVICE_CATEGORIES } from "@/lib/robotxServiceCategories";
import CategoryBox from "../CategoryBox";
import Container from "../Container";

export const categories = [
  {
    label: ROBOTX_SERVICE_CATEGORIES[0],
    icon: FaRobot,
    description: "Robots for demos, events, and live performance experiences.",
  },
  {
    label: ROBOTX_SERVICE_CATEGORIES[1],
    icon: MdOutlineCleaningServices,
    description: "Autonomous and operator-assisted cleaning service packages.",
  },
  {
    label: ROBOTX_SERVICE_CATEGORIES[2],
    icon: FaWarehouse,
    description: "Automation support for warehouse operations and workflows.",
  },
  {
    label: ROBOTX_SERVICE_CATEGORIES[3],
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
      <div className="pt-4 flex flex-row items-center justify-between overflow-x-auto">
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
