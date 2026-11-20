import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signJwt, verifyJwt } from "@/lib/auth/crypto";
import { parseSessionTokenEdge } from "@/lib/auth/session-edge";
import { createSessionCookie, parseSessionToken, sessionAbsoluteExpiry } from "@/lib/auth/session";
import {
  PLATFORM_SESSION_MAX_AGE_SEC,
  SESSION_MAX_AGE_SEC,
  toPublicSession,
  type AppSessionUser,
} from "@/lib/auth/types";

/** Identifiant de session (jti), durée absolue (authAt) et compatibilité des anciens jetons. */
const ROOT = "s".repeat(48);
const DAY = 86_400;
const now = () => Math.floor(Date.now() / 1000);

const user: AppSessionUser = {
  id: "u_1", email: "u@t.test", firstName: "S", lastName: "A", role: "OWNER", organizationId: "org_a",
  orgName: "A", orgSlug: "a", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION",
  mustChangePassword: false, sessionVersion: 3,
};
const claims = { ...user, scope: "app", accountType: "ORGANIZATION" };

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", ROOT);
  vi.stubEnv("AUTH_KEY_SEPARATION", "");
  vi.stubEnv("AUTH_ACCEPT_LEGACY_SESSION_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

const payloadOf = (cookie: { value: string }) =>
  verifyJwt<Record<string, unknown>>(cookie.value, ROOT, { allowLegacy: true })!;

describe("jti et authAt", () => {
  it("une nouvelle session reçoit un jti aléatoire et authAt = maintenant", () => {
    const a = payloadOf(createSessionCookie(user));
    const b = payloadOf(createSessionCookie(user));
    expect(a.jti).toMatch(/^[0-9a-f]{32}$/);
    expect(a.jti).not.toBe(b.jti);
    expect(Math.abs((a.authAt as number) - now())).toBeLessThan(5);
    expect(a.typ).toBe("session");
  });

  it("le renouvellement garde le jti et l'authAt d'origine", () => {
    const first = createSessionCookie(user);
    const parsed = parseSessionToken(first.value)!;
    expect(parsed.jti).toBe(payloadOf(first).jti);
    const renewed = payloadOf(createSessionCookie({ ...parsed, sessionVersion: 4 }));
    expect(renewed.jti).toBe(parsed.jti);
    expect(renewed.authAt).toBe(parsed.authAt);
    expect(renewed.sessionVersion).toBe(4);
  });

  it("le profil public ne contient ni jti ni authAt", () => {
    const parsed = parseSessionToken(createSessionCookie(user).value)!;
    expect(parsed.jti).toBeTruthy();
    const publicUser = toPublicSession(parsed) as Record<string, unknown>;
    expect(publicUser).not.toHaveProperty("jti");
    expect(publicUser).not.toHaveProperty("authAt");
    expect(publicUser.id).toBe("u_1");
  });

  it("un ancien jeton sans jti ni authAt reste valide, authAt = iat, et reçoit un jti au renouvellement", async () => {
    const legacy = signJwt(claims, ROOT, 600);
    const parsed = parseSessionToken(legacy)!;
    expect(parsed).toMatchObject({ id: "u_1", sessionVersion: 3 });
    expect(parsed.jti).toBeUndefined();
    expect(Math.abs(parsed.authAt! - now())).toBeLessThan(5);
    expect(await parseSessionTokenEdge(legacy)).toMatchObject({ id: "u_1" });
    expect(payloadOf(createSessionCookie(parsed)).jti).toMatch(/^[0-9a-f]{32}$/);
  });

  it("un jti de forme invalide est ignoré (jamais interrogé en base)", () => {
    const parsed = parseSessionToken(signJwt({ ...claims, jti: "x" }, ROOT, 600))!;
    expect(parsed.jti).toBeUndefined();
  });
});

describe("durée absolue de session", () => {
  it("un institut ne dépasse jamais 30 jours depuis l'authentification, même renouvelé", async () => {
    const old = signJwt({ ...claims, jti: "j".repeat(16), authAt: now() - 31 * DAY }, ROOT, 3600);
    expect(parseSessionToken(old)).toBeNull();
    expect(await parseSessionTokenEdge(old)).toBeNull();
    const fine = signJwt({ ...claims, jti: "j".repeat(16), authAt: now() - 29 * DAY }, ROOT, 3600);
    expect(parseSessionToken(fine)).toMatchObject({ id: "u_1" });
  });

  it("une session plateforme est bornée à 7 jours", () => {
    const platform = {
      id: "pu_1", email: "a@t.test", firstName: "A", lastName: "A", role: "SUPER_ADMIN",
      scope: "platform", accountType: "PLATFORM", sessionVersion: 0,
    };
    expect(parseSessionToken(signJwt({ ...platform, authAt: now() - 8 * DAY }, ROOT, 3600))).toBeNull();
    expect(parseSessionToken(signJwt({ ...platform, authAt: now() - 6 * DAY }, ROOT, 3600))).toMatchObject({ id: "pu_1" });
  });

  it("l'expiration du jeton renouvelé est plafonnée à l'échéance absolue", () => {
    const authAt = now() - (SESSION_MAX_AGE_SEC - 3600); // il reste une heure
    const cookie = createSessionCookie({ ...user, jti: "j".repeat(16), authAt });
    const payload = payloadOf(cookie);
    expect(payload.exp as number).toBeLessThanOrEqual(authAt + SESSION_MAX_AGE_SEC + 1);
    expect(cookie.maxAge).toBeLessThanOrEqual(3600 + 1);
  });

  it("plateforme : plafond de 7 jours à l'émission, session navigateur (maxAge null) comprise", () => {
    const platform = { ...user, scope: "platform", accountType: "PLATFORM", role: "SUPER_ADMIN" } as never;
    const cookie = createSessionCookie(platform, null);
    expect(cookie).not.toHaveProperty("maxAge");
    const payload = payloadOf(cookie);
    expect((payload.exp as number) - (payload.iat as number)).toBeLessThanOrEqual(PLATFORM_SESSION_MAX_AGE_SEC);
  });

  it("sessionAbsoluteExpiry = authAt + plafond du périmètre", () => {
    expect(sessionAbsoluteExpiry({ scope: "app", authAt: 1000 }).getTime()).toBe((1000 + SESSION_MAX_AGE_SEC) * 1000);
    expect(sessionAbsoluteExpiry({ scope: "platform", authAt: 1000 }).getTime()).toBe(
      (1000 + PLATFORM_SESSION_MAX_AGE_SEC) * 1000,
    );
  });
});
