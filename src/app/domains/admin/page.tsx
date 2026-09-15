import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  redirect("/dashboard/?__host=admin");
}
