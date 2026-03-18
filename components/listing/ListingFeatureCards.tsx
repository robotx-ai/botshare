"use client";

import Image from "next/image";
import React from "react";

type FeatureCard = {
  title: string;
  bullets: string[];
  emoji: string;
  imageSrc?: string;
};

const CLD = "https://res.cloudinary.com/dmrhtzqyx/image/upload/q_auto,f_auto";

const FEATURE_CARDS: Record<string, FeatureCard[]> = {
  "Showcase & Performance": [
    {
      title: "Fashion Show",
      bullets: ["Synchronized choreography", "Multi-robot runway", "On-site tech support"],
      emoji: "🎭",
      imageSrc: `${CLD}/listing-agibot-a2`,
    },
    {
      title: "Stage Co-Host",
      bullets: ["AI live commentary", "6+ language support", "Brand personalization"],
      emoji: "🎤",
      imageSrc: `${CLD}/listing-agibot-a2`,
    },
    {
      title: "Corporate Gala",
      bullets: ["Autonomous navigation", "Facial recognition", "Guest interaction"],
      emoji: "🏢",
      imageSrc: `${CLD}/listing-agibot-a2`,
    },
    {
      title: "Gallery Guide",
      bullets: ["Multilingual narration", "Interactive Q&A", "Visitor engagement"],
      emoji: "🖼",
      imageSrc: `${CLD}/listing-agibot-a2`,
    },
  ],
  Warehouse: [
    {
      title: "Inventory Patrol",
      bullets: ["Autonomous shelf scan", "Real-time stock alerts", "Route optimization"],
      emoji: "📦",
      imageSrc: `${CLD}/listing-agibot-g2`,
    },
    {
      title: "Pick Assist",
      bullets: ["Human-robot collaboration", "Voice-guided picking", "Error reduction"],
      emoji: "🤝",
      imageSrc: `${CLD}/listing-agibot-g2`,
    },
    {
      title: "Safety Monitor",
      bullets: ["Hazard detection", "Incident logging", "24/7 coverage"],
      emoji: "🦺",
      imageSrc: `${CLD}/listing-agibot-g2`,
    },
    {
      title: "Delivery Run",
      bullets: ["Inter-zone transport", "Load capacity up to 20kg", "Scheduled routes"],
      emoji: "🚚",
      imageSrc: `${CLD}/listing-pudu-flashbot`,
    },
  ],
  Restaurant: [
    {
      title: "Table Service",
      bullets: ["Food delivery to tables", "Reduces wait-staff load", "Tray balancing system"],
      emoji: "🍽",
      imageSrc: `${CLD}/listing-pudu-bellabot`,
    },
    {
      title: "Host & Greet",
      bullets: ["Welcomes customers", "Queue management", "Multilingual support"],
      emoji: "👋",
      imageSrc: `${CLD}/listing-pudu-kettybot`,
    },
    {
      title: "Drink Runner",
      bullets: ["Bar-to-table delivery", "Spill-resistant tray", "High-traffic capable"],
      emoji: "🥤",
      imageSrc: `${CLD}/listing-pudu-bellabot`,
    },
    {
      title: "Promo Display",
      bullets: ["Menu showcase", "Daily specials broadcast", "Brand messaging"],
      emoji: "📺",
      imageSrc: `${CLD}/listing-pudu-kettybot`,
    },
  ],
};

type Props = {
  category: string;
};

function ListingFeatureCards({ category }: Props) {
  const cards = FEATURE_CARDS[category];
  if (!cards) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">What we can do for you</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="border border-neutral-200 rounded-xl overflow-hidden bg-white"
          >
            {card.imageSrc ? (
              <div className="relative w-full h-28">
                <Image
                  src={card.imageSrc}
                  alt={card.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-28 bg-neutral-800 flex items-center justify-center text-4xl">
                {card.emoji}
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-semibold mb-1">{card.title}</p>
              <ul className="space-y-0.5">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="text-xs text-neutral-500">
                    · {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ListingFeatureCards;
