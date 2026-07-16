export function formatFirestoreError(error: unknown, fallback = "Something went wrong.") {
  if (!(error instanceof Error)) return fallback;
  if (/insufficient permissions|missing or insufficient permissions/i.test(error.message)) {
    return "Access denied. Sign in again, confirm you're an admin of this group, then retry.";
  }
  return error.message;
}
