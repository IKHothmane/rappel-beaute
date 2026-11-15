import { Wallet } from "lucide-react";

/** Ajout de la carte au Wallet du téléphone : action explicite, jamais une redirection automatique. */
export function LoyaltyWalletCta({ token }: { token: string }) {
  return (
    <section aria-labelledby="loyalty-wallet-title" className="rounded-2xl border border-[#E7B9CD] bg-[#FFF8FB] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A83E70] text-white">
          <Wallet size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="loyalty-wallet-title" className="!font-extrabold !tracking-normal text-lg text-[#43293A]">
            Gardez votre carte sur votre téléphone
          </h2>
          <p className="mt-1 text-sm text-[#6B5763]">
            Ajoutez-la à Apple Wallet ou Google Wallet : vous la retrouvez en un geste, sans rechercher ce lien.
          </p>
        </div>
      </div>
      {/* Lien classique : /carte/[token]/google/ choisit Apple ou Google selon le téléphone. */}
      <a
        href={`/carte/${encodeURIComponent(token)}/google/`}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#A83E70] px-4 text-base font-bold text-white transition hover:bg-[#8F3360] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#3A2533]"
      >
        <Wallet size={18} aria-hidden="true" />
        Ajouter à mon Wallet
      </a>
    </section>
  );
}
