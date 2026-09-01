export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set (min 32 chars) in production.");
    }
    return "dev-only-insecure-secret-change-me-32chars";
  }
  return secret;
}
