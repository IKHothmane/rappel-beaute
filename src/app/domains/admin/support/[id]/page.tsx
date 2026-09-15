import { redirect } from "next/navigation";

/** Ancien détail de session — consolidé dans Support tickets */
export default function SupportSessionDetailRedirect() {
  redirect("/support/tickets/");
}
