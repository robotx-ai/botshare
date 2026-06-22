"use client";

import React, { useState } from "react";
import {
  FieldErrors,
  FieldValues,
  RegisterOptions,
  UseFormRegister,
} from "react-hook-form";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

type Props = {
  id: string;
  label: string;
  type?: string;
  optional?: boolean;
  disabled?: boolean;
  required?: boolean;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
  /** Extra react-hook-form validation rules (e.g. a custom message or validator). */
  registerOptions?: RegisterOptions;
};

/**
 * Floating-label input matching the "Aire" sign-up direction. Refined version
 * of components/inputs/Input — rounded-xl, brand tokens, and a password
 * show/hide toggle baked in.
 */
function FloatingInput({
  id,
  label,
  type = "text",
  optional,
  disabled,
  required,
  register,
  errors,
  registerOptions,
}: Props) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && show ? "text" : type;
  const hasError = Boolean(errors[id]);
  const errorMessage = errors[id]?.message as string | undefined;

  return (
    <div className="relative w-full">
      <input
        id={id}
        type={resolvedType}
        placeholder=" "
        disabled={disabled}
        {...register(id, { required, ...registerOptions })}
        className={`peer h-14 w-full rounded-xl border-[1.5px] bg-white px-4 pb-2 pt-6 text-[15px] font-semibold text-brand outline-none transition disabled:opacity-70 ${
          isPassword ? "pr-12" : ""
        } ${hasError ? "border-rose-400 focus:border-rose-500" : "border-brand-subtle focus:border-brand"}`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-4 top-1/2 origin-[0] -translate-y-1/2 transform text-[15px] font-medium transition-all duration-150 peer-focus:top-[9px] peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-bold peer-focus:tracking-wide peer-[:not(:placeholder-shown)]:top-[9px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold ${
          hasError ? "text-rose-500" : "text-brand-muted peer-focus:text-brand"
        }`}
      >
        {label}
        {optional && <span className="font-medium text-brand-muted"> · optional</span>}
      </label>
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-muted transition hover:text-brand"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
        </button>
      )}
      {errorMessage && (
        <p className="mt-1.5 px-1 text-[12.5px] font-semibold text-rose-500">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default FloatingInput;
