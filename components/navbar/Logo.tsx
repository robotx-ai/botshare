"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  transparent?: boolean;
};

function Logo({ transparent = false }: Props) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push("/")}
      className="flex items-center gap-2 cursor-pointer select-none w-fit"
      aria-label="Hifivebot home"
    >
      <Image
        alt="Hifivebot"
        className="h-9 w-9 md:h-10 md:w-10 transition-transform duration-300 hover:scale-105"
        height={256}
        width={256}
        src="/hifivebot-icon.png"
        priority
      />
      <span
        className={`hidden md:block text-xl font-extrabold tracking-tight transition-colors duration-300 ${
          transparent ? "text-white" : "text-neutral-900"
        }`}
      >
        Hifivebot
      </span>
    </div>
  );
}

export default Logo;
