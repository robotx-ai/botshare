// Central password policy, shared by the signup UI (live checklist + submit
// gate) and the /api/register route (server-side enforcement).
// Rule: at least 8 characters, with a letter, a number, and one uppercase letter.

export type PasswordChecks = {
  length: boolean;
  letter: boolean;
  number: boolean;
  caps: boolean;
  valid: boolean;
};

export function validatePassword(pw: string | null | undefined): PasswordChecks {
  const s = String(pw ?? "");
  const length = s.length >= 8;
  const letter = /[a-zA-Z]/.test(s);
  const number = /[0-9]/.test(s);
  const caps = /[A-Z]/.test(s);
  return { length, letter, number, caps, valid: length && letter && number && caps };
}

export const PASSWORD_RULE_MESSAGE =
  "Password must be at least 8 characters and include a letter, a number, and an uppercase letter.";
