import { describe, expect, it } from "vitest";
import { originAccessAllowed } from "@/lib/http/origin-guard";

describe("origine Cloudflare", () => {
  it("sans secret configuré, la requête passe", () => {
    expect(originAccessAllowed(null, undefined)).toBe(true);
    expect(originAccessAllowed("nimporte", "")).toBe(true);
  });

  it("secret requis et header absent → refus", () => {
    expect(originAccessAllowed(null, "secret-origine")).toBe(false);
  });

  it("header incorrect → refus", () => {
    expect(originAccessAllowed("autre", "secret-origine")).toBe(false);
    expect(originAccessAllowed("secret-origine-x", "secret-origine")).toBe(false);
  });

  it("header exact → accès", () => {
    expect(originAccessAllowed("secret-origine", "secret-origine")).toBe(true);
  });

  it("staging : le host public Railway passe sans header", () => {
    const prevEnv = process.env.APP_ENV;
    const prevUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.APP_ENV = "staging";
    process.env.NEXT_PUBLIC_APP_URL = "https://rappel-beaute-staging.up.railway.app";
    expect(
      originAccessAllowed(null, "secret-origine", "rappel-beaute-staging.up.railway.app"),
    ).toBe(true);
    expect(originAccessAllowed(null, "secret-origine", "app.rappelbeauty.com")).toBe(false);
    if (prevEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = prevEnv;
    if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prevUrl;
  });
});
