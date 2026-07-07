export function formatFirestoreError(error: unknown, fallback = "Une erreur est survenue.") {
  if (!(error instanceof Error)) return fallback;
  if (/insufficient permissions|missing or insufficient permissions/i.test(error.message)) {
    return "Accès refusé. Reconnecte-toi, vérifie que tu es admin du groupe, puis réessaie.";
  }
  return error.message;
}
