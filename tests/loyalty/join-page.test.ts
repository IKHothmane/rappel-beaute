import { describe, expect, it } from "vitest";
import { directEnrollPage, enrollmentPage } from "@/app/(marketing)/carte/rejoindre/[token]/join-pages";

describe("page de scan : carte directe", () => {
  const html = directEnrollPage({ token: "RBJOIN_4ZC5CBA2G7G9", organizationName: "Maison <Belle>" });

  it("demande le profil puis crée la carte aussitôt, sans code", () => {
    for (const marker of ['name="firstName"', 'name="lastName"', 'name="phone"']) expect(html).toContain(marker);
    expect(html).not.toContain("code de vérification");
    expect(html).not.toContain("Compléter mon profil");
    expect(html).toContain('action: "enroll"');
    expect(html).toContain("Maison &lt;Belle&gt;");
    expect(html).not.toContain("mode=recover");
    // Champs limités côté page : téléphone 10 chiffres, noms 40 caractères.
    expect(html).toMatch(/name="phone"[^>]*maxlength="10"/);
    expect(html).toMatch(/name="firstName"[^>]*maxlength="40"/);
    expect(html).toMatch(/name="lastName"[^>]*maxlength="40"/);
  });

  it("le script inline est du JavaScript valide", () => {
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
    expect(() => new Function(script as string)).not.toThrow();
  });
});

describe("page de scan du QR de fidélité", () => {
  const html = enrollmentPage({ token: "RBJOIN_4ZC5CBA2G7G9", organizationName: "Maison <Belle> & Co" });

  it("échappe le nom de l'institut et le jeton", () => {
    expect(html).toContain("Maison &lt;Belle&gt; &amp; Co");
    expect(html).not.toContain("<Belle>");
    expect(html).toContain('data-token="RBJOIN_4ZC5CBA2G7G9"');
  });

  it("garde les champs et identifiants attendus par l'API et le script", () => {
    for (const marker of [
      'name="firstName"', 'name="lastName"', 'name="phone"', 'name="marketingWhatsappConsent"',
      'value="enroll"', 'value="recover"', 'id="request"', 'id="pending"', 'id="code"',
      'id="claim"', 'id="restart"', 'id="notice"', 'id="marketing"', "/api/public/loyalty-join/",
    ]) {
      expect(html).toContain(marker);
    }
  });

  it("n'embarque aucune ressource distante", () => {
    expect(html).not.toMatch(/(src|href)="https?:\/\//);
    expect(html).not.toContain("fonts.googleapis");
  });

  it("le script inline est du JavaScript valide", () => {
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
    expect(script).toBeTruthy();
    expect(() => new Function(script as string)).not.toThrow();
  });
});
