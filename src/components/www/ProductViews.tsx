import Image from "next/image";

export function ServicesView({ className = "" }: { className?: string }) {
  return (
    <figure
      className={`overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-28px_rgba(190,24,93,0.45)] ${className}`}
    >
      <Image
        src="/marketing/screen-services.png"
        alt="Services et prestations Rappel Beauty sur ordinateur"
        width={1536}
        height={1024}
        sizes="(max-width: 768px) 100vw, 720px"
        className="h-auto w-full object-contain"
      />
    </figure>
  );
}

export function ReceiptView() {
  return (
    <figure className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white p-1.5 shadow-[0_24px_65px_-30px_rgba(23,16,24,0.55)]">
      <Image
        src="/marketing/screen-caisse.png"
        alt="Caisse Rappel Beauty sur ordinateur"
        width={1536}
        height={1024}
        sizes="(max-width: 1024px) 100vw, 960px"
        className="h-auto w-full object-contain"
      />
    </figure>
  );
}
