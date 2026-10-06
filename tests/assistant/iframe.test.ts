import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as frameGet } from "@/app/api/public/assistant/frame/route";
import { GET as readSession, POST as openSession } from "@/app/api/public/assistant/session/route";
import { ensurePreviewWidget } from "@/lib/db/assistant-session";
import { resetRateLimitsForTests } from "@/lib/rate-limit";
import { ensureSecondOrg } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Iframe assistant public", () => {
  beforeAll(async () => {
    resetRateLimitsForTests();
    await ensurePreviewWidget();
  });

  it("ouvre une session pour le domaine autorisé et nomme l'institut", async () => {
    const opened = await openSession(
      new NextRequest("http://localhost:3000/api/public/assistant/session/", {
        method: "POST",
        headers: { origin: "http://localhost:3000", "content-type": "application/json" },
        body: JSON.stringify({ publicId: "pub_preview" }),
      }),
    );
    expect(opened.status).toBe(200);
    const body = (await opened.json()) as { token: string };
    expect(body.token).toEqual(expect.any(String));

    const read = await readSession(
      new NextRequest("http://localhost:3000/api/public/assistant/session/", {
        headers: { authorization: `Bearer ${body.token}` },
      }),
    );
    expect(read.status).toBe(200);
    const info = (await read.json()) as { organizationName: string };
    expect(info.organizationName.length).toBeGreaterThan(1);
    expect(JSON.stringify(info)).not.toContain("customerId");
  });

  it("refuse un autre domaine et un institut imposé", async () => {
    const denied = await openSession(
      new NextRequest("http://localhost:3000/api/public/assistant/session/", {
        method: "POST",
        headers: { origin: "https://autre.example", "content-type": "application/json" },
        body: JSON.stringify({ publicId: "pub_preview" }),
      }),
    );
    expect(denied.status).toBe(403);

    const otherOrg = await ensureSecondOrg();
    const spoofed = await openSession(
      new NextRequest("http://localhost:3000/api/public/assistant/session/", {
        method: "POST",
        headers: { origin: "http://localhost:3000", "content-type": "application/json" },
        body: JSON.stringify({ publicId: "pub_preview", organizationId: otherOrg }),
      }),
    );
    expect(spoofed.status).toBe(403);
  });

  it("autorise l'iframe seulement pour les domaines du widget", async () => {
    const res = await frameGet(
      new NextRequest("http://localhost:3000/api/public/assistant/frame/?publicId=pub_preview"),
    );
    expect(res.headers.get("content-security-policy")).toContain("http://localhost:3000");
    expect(res.headers.get("x-frame-options")).toBeNull();
    const html = await res.text();
    expect(html).toContain("qu'après confirmation");
    expect(html).not.toContain("customerId");
  });
});
