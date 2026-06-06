"use client";

import React from "react";
import { IconType } from "react-icons";
import { FiChevronRight } from "react-icons/fi";

type Props = {
  icon: IconType;
  title: string;
  description: string;
  onClick: () => void;
};

/** A single selectable role card in the sign-up role picker. */
function RoleCard({ icon: Icon, title, description, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-1 flex-col gap-3 rounded-2xl border-[1.5px] border-brand-subtle bg-white p-[18px] text-left shadow-[0_1px_2px_rgba(20,23,28,0.03)] transition-all duration-150 hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_14px_32px_rgba(20,23,28,0.10)]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-surface text-brand transition-colors duration-150 group-hover:bg-brand group-hover:text-white">
        <Icon size={24} />
      </span>
      <span>
        <span className="block text-[16.5px] font-extrabold text-brand">{title}</span>
        <span className="mt-1 block text-[13px] leading-relaxed text-brand-muted">
          {description}
        </span>
      </span>
      <span className="mt-auto inline-flex items-center gap-1 text-[12.5px] font-extrabold text-brand-muted transition-colors group-hover:text-brand">
        Continue <FiChevronRight size={14} />
      </span>
    </button>
  );
}

export default RoleCard;
