import { redirect } from "next/navigation";

/** Ancienne page Sessions — tout le support est dans /support/tickets/ */
export default function SupportSessionsRedirect() {
  redirect("/support/tickets/");
}
