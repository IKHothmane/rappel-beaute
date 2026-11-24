import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { AppPageHeader } from "@/components/app/AppUi";
import { useSession } from "@/components/auth/session-provider";
import { usePlanFeatures } from "@/components/subscriptions/plan-features-provider";
import { getTutorial, type TutorialSnapshot } from "@/components/tutorial/api";
import { TUTORIAL_REFRESH_EVENT } from "@/components/tutorial/events";
import { onboardingAccess } from "@/components/tutorial/logic";
import { RestartTutorialButton } from "@/components/tutorial/RestartTutorialButton";
import { applicableSteps } from "@/components/tutorial/steps";
import { isAppSession } from "@/lib/auth/types";

/**
 * Checklist de configuration, réservée au propriétaire : la progression n'est calculée que pour lui (le GET renvoie
 * une progression vide aux autres rôles, qui s'afficherait comme un faux « 0 % »). Les étapes viennent du parcours
 * guidé (steps.ts) : « tutoriel vu » ne signifie pas « configuration terminée », seule la progression métier compte.
 */
export default function OnboardingPage() {
  const { user, loading: sessionLoading } = useSession();
  const access = onboardingAccess({
    loading: sessionLoading,
    role: user && isAppSession(user) ? user.role : null,
  });
  if (access === "owner") return <OwnerChecklist />;
  return (
    <>
      <AppPageHeader
        title="Configuration de l’institut"
        description="Suivez ce qu’il reste à configurer."
        action={
          <Link href="/dashboard/" className="btn-ghost min-h-11">
            Aller au tableau de bord
          </Link>
        }
      />
      {access === "loading" ? (
        <div role="status" className="surface max-w-xl p-6 text-sm text-ink/70">
          Chargement…
        </div>
      ) : (
        <div role="status" className="surface max-w-xl p-6 text-sm text-ink/70">
          Cette page est réservée au propriétaire de l’institut, qui configure les services, l’équipe et les horaires.
        </div>
      )}
    </>
  );
}

function OwnerChecklist() {
  const { isNavEnabled, loading: planLoading } = usePlanFeatures();
  const [snap, setSnap] = useState<TutorialSnapshot | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    const result = await getTutorial();
    if (result) {
      setSnap(result);
      setState("ready");
    } else {
      setState((current) => (current === "ready" ? current : "error"));
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(TUTORIAL_REFRESH_EVENT, load);
    return () => window.removeEventListener(TUTORIAL_REFRESH_EVENT, load);
  }, [load]);

  const items = planLoading ? [] : applicableSteps(isNavEnabled);
  const required = items.filter((item) => !item.optional);
  const doneCount = snap ? required.filter((item) => item.done(snap.progress)).length : 0;
  const percent = required.length === 0 ? 0 : Math.round((doneCount / required.length) * 100);
  const complete = state === "ready" && required.length > 0 && doneCount === required.length;

  return (
    <>
      <AppPageHeader
        title="Configuration de l’institut"
        description="Suivez ce qu’il reste à configurer. Rien ne bloque l’usage : revenez quand vous voulez."
        action={
          <div className="flex flex-wrap gap-2">
            <RestartTutorialButton className="btn-ghost min-h-11">Revoir le tutoriel</RestartTutorialButton>
            <Link href="/dashboard/" className="btn-ghost min-h-11">
              Aller au tableau de bord
            </Link>
          </div>
        }
      />

      {state === "error" ? (
        <div role="status" className="surface max-w-xl p-6 text-sm text-ink/70">
          La progression n’est pas disponible pour le moment. Vous pouvez tout de même configurer votre institut depuis le menu.
        </div>
      ) : (
        <>
          <div className="mb-6 surface p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span>{state === "loading" ? "Chargement…" : `${doneCount} étape${doneCount > 1 ? "s" : ""} sur ${required.length}`}</span>
              <span className="font-mono text-ink/45">{state === "loading" ? "" : `${percent} %`}</span>
            </div>
            <div
              role="progressbar"
              aria-label="Progression de la configuration"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={state === "loading" ? undefined : percent}
              aria-busy={state === "loading"}
              className="h-2 overflow-hidden rounded-full bg-primary-light"
            >
              <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
            </div>
            {complete ? <p className="mt-3 text-sm font-semibold text-emerald-700">Votre institut est prêt à recevoir des rendez-vous.</p> : null}
          </div>

          <ul className="surface max-w-2xl divide-y divide-line">
            {items.map((item) => {
              const done = !!snap && item.done(snap.progress);
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                  {done ? (
                    <CheckCircle2 size={22} className="shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <Circle size={22} className="shrink-0 text-ink/25" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {item.checklist.label}
                      {item.optional ? <span className="ml-2 text-xs font-normal text-ink/45">Facultatif</span> : null}
                      <span className="sr-only">{done ? " — terminé" : " — à faire"}</span>
                    </p>
                    <p className="text-xs text-ink/55">{item.checklist.hint}</p>
                  </div>
                  <Link href={item.route} className="btn-ghost min-h-11 shrink-0">
                    {done ? "Consulter" : item.checklist.cta}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
