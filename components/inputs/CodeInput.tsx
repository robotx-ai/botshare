"use client";

import React, { useRef, useState } from "react";

type Props = {
  length?: number;
  disabled?: boolean;
  /** Fires once every box is filled, with the joined code. */
  onComplete?: (code: string) => void;
  /** Fires on every change with the current joined value. */
  onChange?: (code: string) => void;
};

/** Six-box one-time-code entry with auto-advance, backspace and paste support. */
function CodeInput({ length = 6, disabled, onComplete, onChange }: Props) {
  const [vals, setVals] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const commit = (next: string[]) => {
    setVals(next);
    const joined = next.join("");
    onChange?.(joined);
    if (next.every((c) => c !== "")) onComplete?.(joined);
  };

  const handle = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const next = [...vals];
    if (!digits) {
      next[i] = "";
      commit(next);
      return;
    }
    if (digits.length > 1) {
      let j = i;
      for (const ch of digits) {
        if (j >= length) break;
        next[j] = ch;
        j += 1;
      }
      commit(next);
      refs.current[Math.min(length - 1, i + digits.length)]?.focus();
    } else {
      next[i] = digits;
      commit(next);
      refs.current[i + 1]?.focus();
    }
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !vals[i] && i > 0) {
      e.preventDefault();
      const next = [...vals];
      next[i - 1] = "";
      commit(next);
      refs.current[i - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2.5">
      {vals.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={v}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handle(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={`h-14 w-full rounded-xl border-[1.5px] bg-white text-center text-[21px] font-bold text-brand outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(17,24,39,0.12)] disabled:opacity-60 ${
            v ? "border-brand" : "border-brand-subtle"
          }`}
        />
      ))}
    </div>
  );
}

export default CodeInput;
