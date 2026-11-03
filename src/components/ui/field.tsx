import { useState } from "react";

export type FieldErrors = Record<string, string>;

export function useFieldErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});

  function clear(key?: string) {
    if (!key) {
      setErrors({});
      return;
    }
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function reject(next: FieldErrors) {
    setErrors(next);
    return Object.keys(next).length > 0;
  }

  return { errors, clear, reject };
}

export function inputClass(invalid: boolean, extra = "") {
  return `input${extra ? ` ${extra}` : ""}${invalid ? " border-red-500 focus:border-red-500 focus:ring-red-100" : ""}`;
}

export function FieldError({ message, className = "" }: { message?: string; className?: string }) {
  if (!message) return null;
  return <p className={`mt-1 text-sm font-normal text-red-600 ${className}`}>{message}</p>;
}

export function emailProblem(value: string) {
  const email = value.trim();
  if (!email) return "Upiši e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "E-mail nije ispravan.";
  return "";
}
