"use client";

import Image from "next/image";
import React from "react";

type Props = {
  src: string | null | undefined;
  userName?: string | null | undefined;
};

function Avatar({ src, userName }: Props) {
  const initials =
    userName
      ?.trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "BS";

  return (
    <div>
      {src ? (
        <Image
          className="rounded-full"
          height="30"
          width="30"
          alt="User avatar"
          src={src}
        />
      ) : userName ? (
        <div className="rounded-full h-[30px] w-[30px] bg-brand text-white text-xs font-semibold flex items-center justify-center">
          {initials}
        </div>
      ) : (
        <Image
          className="rounded-full"
          height="30"
          width="30"
          alt="Default avatar"
          src="/assets/avatar.png"
        />
      )}
    </div>
  );
}

export default Avatar;
