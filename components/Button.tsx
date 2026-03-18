"use client";

import React from "react";
type Props = {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  outline?: boolean;
  small?: boolean;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  isColor?: boolean;
};

function Button({
  label,
  onClick,
  disabled,
  outline,
  small,
  icon: Icon,
  isColor,
}: Props) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`relative disabled:opacity-70 disabled:cursor-not-allowed rounded-lg hover:opacity-80 transition w-full ${
        outline ? "bg-white" : "bg-brand"
      } ${outline ? "border-black" : "border-brand"} ${
        outline ? "text-black" : "text-white"
      } ${small ? "text-sm" : "text-md"} ${small ? "py-1" : "py-3"} ${
        small ? "font-light" : "font-semibold"
      } ${small ? "border-[1px]" : "border-2"}`}
    >
      {Icon && (
        <Icon
          size={24}
          className={`absolute left-4 top-3 ${isColor && "text-brand"}`}
        />
      )}
      {label}
    </button>
  );
}

export default Button;
