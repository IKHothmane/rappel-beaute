import { redirect } from "next/navigation";

type Props = { params: { id: string } };

export default function CustomerDetailPage(_props: Props) {
  redirect("/customers/");
}
