import { describe, expect, it } from "vitest";
import {
  PROFESSIONAL_SIGNUP_NOTIFY_EMAIL,
  signupLeadEmail,
} from "@/lib/email/signup-lead";

describe("E-mail de notification inscription professionnelle", () => {
  it("résume le formulaire sans mot de passe", () => {
    const mail = signupLeadEmail({
      personName: "Amina Benali",
      institut: "Institut Lumière",
      email: "amina@institut.ma",
      phone: "+212619440375",
      city: "Casablanca",
      address: "12 rue des Fleurs",
      message: "3 cabines, soins visage",
      logoName: "logo.png",
    });

    expect(PROFESSIONAL_SIGNUP_NOTIFY_EMAIL).toBe("ikhlef.othmane@gmail.com");
    expect(mail.subject).toContain("Institut Lumière");
    expect(mail.text).toContain("Amina Benali");
    expect(mail.text).toContain("amina@institut.ma");
    expect(mail.text).toContain("+212619440375");
    expect(mail.text).toContain("Casablanca");
    expect(mail.text).toContain("12 rue des Fleurs");
    expect(mail.text).toContain("3 cabines, soins visage");
    expect(mail.text).toContain("logo.png");
    expect(mail.html).toContain("Nouvelle inscription professionnelle");
    expect(mail.text.toLowerCase()).not.toContain("mot de passe");
  });
});
