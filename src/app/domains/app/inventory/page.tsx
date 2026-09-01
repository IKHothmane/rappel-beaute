import { redirect } from "next/navigation";

/** Alias historique → /stock */
export default function InventoryRedirectPage() {
  redirect("/stock/");
}
