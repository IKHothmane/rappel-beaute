import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pages réservées au propriétaire : la progression n'existe que pour lui (le GET renvoie une progression vide aux
 * autres rôles). Un autre rôle ne doit jamais voir un faux « 0 % » ni l'entrée de menu qui y mène.
 * Rendu serveur (le projet n'embarque pas jsdom) : les effets ne s'exécutent pas, le balisage initial suffit.
 */
const fakes = vi.hoisted(() => ({
  session: { user: null as unknown, loading: false },
  getSession: vi.fn(),
  getTutorial: vi.fn(),
}));

vi.mock("@/components/auth/session-provider", () => ({
  useSession: () => ({ user: fakes.session.user, loading: fakes.session.loading }),
}));
vi.mock("@/components/subscriptions/plan-features-provider", () => ({
  usePlanFeatures: () => ({ isNavEnabled: () => true, loading: false }),
}));
vi.mock("@/components/tutorial/api", () => ({ getTutorial: fakes.getTutorial }));
vi.mock("@/lib/auth/session", () => ({ getSession: fakes.getSession }));
vi.mock("@/lib/http/route-scope", () => ({ scopedPage: (_kind: string, page: unknown) => page }));
vi.mock("@/components/layout/more-menu-link", () => ({
  MoreMenuLink: ({ label }: { label: string }) => label,
}));

import OnboardingPage from "@/app/domains/app/onboarding/page";
import MorePage from "@/app/domains/app/more/page";

const session = (role: string) => ({ id: "u1", scope: "app", role, orgSlug: "institut", mustChangePassword: false });

beforeEach(() => {
  fakes.session = { user: null, loading: false };
  fakes.getSession.mockReset();
  fakes.getTutorial.mockReset();
});

describe("page « Configuration de l’institut »", () => {
  it.each(["MANAGER", "STAFF", "RECEPTIONIST"])("le rôle %s voit un accès réservé, sans progression ni faux 0 %%", (role) => {
    fakes.session = { user: session(role), loading: false };
    const html = renderToStaticMarkup(<OnboardingPage />);
    expect(html).toContain("réservée au propriétaire");
    expect(html).not.toContain("progressbar");
    expect(html).not.toMatch(/>\s*\d+\s*%\s*</);
    expect(html).not.toContain("à faire");
    expect(html).not.toContain("Revoir le tutoriel");
    expect(fakes.getTutorial).not.toHaveBeenCalled();
  });

  it("tant que la session charge, ni refus ni progression", () => {
    fakes.session = { user: null, loading: true };
    const html = renderToStaticMarkup(<OnboardingPage />);
    expect(html).toContain("Chargement");
    expect(html).not.toContain("réservée au propriétaire");
    expect(html).not.toContain("progressbar");
  });

  it("le propriétaire voit la checklist du parcours (une seule source : steps.ts) et « Revoir le tutoriel »", () => {
    fakes.session = { user: session("OWNER"), loading: false };
    const html = renderToStaticMarkup(<OnboardingPage />);
    expect(html).not.toContain("réservée au propriétaire");
    expect(html).toContain("progressbar");
    expect(html).toContain("Revoir le tutoriel");
    for (const label of ["Créer un service", "Ajouter une employée", "Définir des horaires", "Enregistrer le premier rendez-vous"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("Facultatif");
    // Chargement en cours : aucun pourcentage affiché avant la réponse du serveur.
    expect(html).not.toMatch(/>\s*\d+\s*%\s*</);
  });
});

describe("page Menu (mobile)", () => {
  const render = async () => renderToStaticMarkup(await MorePage());

  it("un non-propriétaire ne voit ni « Configuration de l’institut » ni « Revoir le tutoriel »", async () => {
    fakes.getSession.mockResolvedValue(session("MANAGER"));
    const html = await render();
    expect(html).toContain("Paramètres");
    expect(html).not.toContain("Configuration de l’institut");
    expect(html).not.toContain("/onboarding");
    expect(html).not.toContain("Revoir le tutoriel");
  });

  it("sans session, aucune entrée réservée", async () => {
    fakes.getSession.mockResolvedValue(null);
    const html = await render();
    expect(html).not.toContain("Configuration de l’institut");
  });

  it("le propriétaire voit les deux entrées", async () => {
    fakes.getSession.mockResolvedValue(session("OWNER"));
    const html = await render();
    expect(html).toContain("Configuration de l’institut");
    expect(html).toContain("/onboarding");
    expect(html).toContain("Revoir le tutoriel");
  });
});
