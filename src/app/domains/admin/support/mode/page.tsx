import { redirect } from "next/navigation";

/** Ancien sélecteur Mode assistance — démarrer depuis la fiche Institut */
export default function SupportModeRedirect() {
  redirect("/support/tickets/");
}
