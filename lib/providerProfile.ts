// Single source of truth for "is this provider allowed to list?".
// Used by the UI gate (UserMenu), the API gate (POST /api/listings), and the
// profile-page completeness notice.

type ProfileFields = {
  name?: string | null;
  phone?: string | null;
  businessName?: string | null;
};

export function isProviderProfileComplete(user: ProfileFields | null | undefined): boolean {
  return Boolean(
    user?.name?.trim() && user?.phone?.trim() && user?.businessName?.trim()
  );
}
