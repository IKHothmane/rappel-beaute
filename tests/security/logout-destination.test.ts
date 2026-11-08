import { describe, expect, it } from "vitest";
import { logoutDestination } from "@/lib/auth/logout-destination";

describe("Shared logout destination", () => {
  it.each(["https://admin.rappelbeauty.com", "https://app.rappelbeauty.com", "https://rappelbeauty.com"])("returns the public connexion page from %s", (origin) => {
    expect(logoutDestination(origin)).toBe("https://rappelbeauty.com/connexion/?signed_out=1");
  });

  it.each(["http://localhost:3000", "http://127.0.0.1:3001"])("preserves the development server and port: %s", (origin) => {
    expect(logoutDestination(origin)).toBe(`${origin}/connexion/?signed_out=1`);
  });

  it.each(["http://admin.localhost:3000", "http://app.localhost:3000"])("leaves the local admin/app host: %s", (origin) => {
    expect(logoutDestination(origin)).toBe("http://localhost:3000/connexion/?signed_out=1");
  });

  it("keeps staging on its own server and removes app/admin query parameters", () => {
    expect(logoutDestination("https://staging.up.railway.app/dashboard/?__host=admin")).toBe("https://staging.up.railway.app/connexion/?signed_out=1");
  });
});
