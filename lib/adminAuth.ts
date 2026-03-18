import { SafeUser } from "@/types";

function getAdminEmailAllowlist() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function hasAdminConfig() {
  return getAdminEmailAllowlist().length > 0;
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminEmailAllowlist().includes(email.toLowerCase());
}

export function canManageServices(user: SafeUser | null | undefined): boolean {
  if (!user) return false;
  return user.userType === "PROVIDER" || isAdminEmail(user.email);
}
