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
    <div onClick={() => router.push("/")}>
      <Image
        alt="logo"
        className={`hidden md:block cursor-pointer transition-all duration-300 ${transparent ? "brightness-0 invert" : ""}`}
        height="100"
        width="100"
        src="/Botsharing_Logo.png"
      />
    </div>
  );
}

export default Logo;
