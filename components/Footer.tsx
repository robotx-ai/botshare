"use client";

import React, { useEffect, useState } from "react";
import ClientOnly from "./ClientOnly";
import FooterColumn from "@/components/FooterColumn";

type Props = {};

function Footer({}: Props) {
  const [country, setCountry] = useState("United States");

  const itemData = [
    [
      "BOTSHARING US",
      "About BotSharing US",
      "Service categories",
      "Company updates",
      "Careers",
      "Partnerships",
    ],
    [
      "Support",
      "Help Center",
      "BotSharing US Service Assurance",
      "Booking options",
      "Safety information",
      "Report an issue",
    ],
    [
      "Services",
      "Showcase & Performance",
      "Warehouse",
      "Restaurant",
      "Deployment guides",
    ],
  ];

  useEffect(() => {
    fetch(
      `https://extreme-ip-lookup.com/json/?key=${process.env.NEXT_PUBLIC_LOOKUP_KEY}`
    )
      .then((res) => res.json())
      .then((data) => setCountry(data.country));
  }, []);

  const footerColumns = itemData.map((item, index) => (
    <FooterColumn key={`footer-column-${index}-${item[0]}`} index={index} data={item} />
  ));

  return (
    <ClientOnly>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-10 px-32 py-14 bg-gray-100 text-gray-600">
        {footerColumns}
        <div className="flex flex-col gap-1 text-sm">
          <p>{country}</p>
        </div>
      </div>
    </ClientOnly>
  );
}

export default Footer;
