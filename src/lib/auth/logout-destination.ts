import { SITE } from "@/lib/site";

/** Use the shared public login page and drop the app/admin host selector. */
export function logoutDestination(origin: string): string {
  const current = new URL(origin);
  let loginOrigin = current.origin;
  if (current.hostname === "app.rappelbeauty.com" || current.hostname === "admin.rappelbeauty.com") {
    loginOrigin = SITE.url;
  } else if (current.hostname === "app.localhost" || current.hostname === "admin.localhost") {
    current.hostname = "localhost";
    loginOrigin = current.origin;
  }
  return new URL("/connexion/?signed_out=1", loginOrigin).toString();
}
