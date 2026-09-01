"use client";

import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form
        className="surface w-full max-w-md p-8"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/login/");
        }}
      >
        <h1 className="font-display text-2xl font-semibold">Nouveau mot de passe</h1>
        <label className="mt-6 block text-sm">
          <span className="mb-1.5 block font-medium">Mot de passe</span>
          <input type="password" required className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </label>
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium">Confirmer</span>
          <input type="password" required className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </label>
        <button type="submit" className="btn-primary mt-6 w-full">
          Modifier le mot de passe
        </button>
      </form>
    </div>
  );
}
