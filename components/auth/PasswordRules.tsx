"use client";

import React from "react";
import { FiCheck } from "react-icons/fi";
import { validatePassword } from "@/lib/passwordPolicy";

type Props = {
  password: string;
};

/**
 * Live requirements checklist shown under the password field on sign-up.
 * Each rule fills (brand circle + check) as the typed password satisfies it.
 * Monochrome to match the Aire flow.
 */
function PasswordRules({ password }: Props) {
  const r = validatePassword(password);
  const rules = [
    { ok: r.length, label: "8+ characters" },
    { ok: r.letter && r.number, label: "Letters & numbers" },
    { ok: r.caps, label: "One uppercase letter" },
  ];

  return (
    <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5">
      {rules.map((rule) => (
        <span
          key={rule.label}
          className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold transition-colors ${
            rule.ok ? "text-brand" : "text-brand-muted"
          }`}
        >
          <span
            className={`flex h-[15px] w-[15px] items-center justify-center rounded-full border-[1.5px] transition ${
              rule.ok
                ? "border-brand bg-brand text-white"
                : "border-brand-subtle text-transparent"
            }`}
          >
            <FiCheck size={9} style={{ strokeWidth: 3 }} />
          </span>
          {rule.label}
        </span>
      ))}
    </div>
  );
}

export default PasswordRules;
