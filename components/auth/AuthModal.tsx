"use client";

import React, { useCallback, useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";

type Props = {
  isOpen?: boolean;
  onClose: () => void;
  /** "narrow" for forms (~432px), "wide" for the role picker (~520px). */
  size?: "narrow" | "wide";
  disabled?: boolean;
  children: React.ReactNode;
};

/**
 * AuthModal — refined light modal shell used by the sign-up / login flow.
 * Owns the backdrop, open/close animation and the close button only; all
 * content (headings, fields, buttons) is supplied by the caller so each step
 * can own its own layout.
 */
function AuthModal({ isOpen, onClose, size = "narrow", disabled, children }: Props) {
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (disabled) return;
    setShowModal(false);
    setTimeout(onClose, 300);
  }, [disabled, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-neutral-900/60 px-4 py-6 backdrop-blur-[2px]">
      <div
        className={`relative w-full ${
          size === "wide" ? "max-w-[520px]" : "max-w-[432px]"
        } transition-all duration-300 ${
          showModal ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="relative rounded-3xl bg-white px-9 pb-8 pt-9 shadow-[0_30px_90px_rgba(20,23,28,0.18),0_2px_8px_rgba(20,23,28,0.06)]">
          <button
            type="button"
            onClick={handleClose}
            disabled={disabled}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-brand-surface text-brand-muted transition hover:bg-brand-subtle disabled:opacity-50"
          >
            <IoMdClose size={16} />
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
