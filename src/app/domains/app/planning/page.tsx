import { redirect } from "next/navigation";

export default function PlanningPage() {
  redirect("/staff/?tab=planning");
}
