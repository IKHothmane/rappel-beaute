import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="surface p-8">
      <p className="eyebrow">Introuvable</p>
      <h1 className="mt-3 font-display text-3xl font-semibold">Page institut introuvable</h1>
      <Link href="/dashboard/" className="btn-primary mt-6 inline-flex">
        Tableau de bord
      </Link>
    </div>
  );
}
