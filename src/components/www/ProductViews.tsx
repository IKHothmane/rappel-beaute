import Image from "next/image";

export function ReceiptView() {
  return (
    <figure className="mx-auto max-w-[var(--vt-size-64rem)] overflow-hidden rounded-2xl border border-white/10 bg-white p-[var(--vt-size-0p375rem)] shadow-[0_24px_65px_-30px_rgba(23,16,24,0.55)]">
      <Image
        src="/site/rappelbeauty-caisse-pc-reel.webp"
        alt="Caisse Rappel Beauty sur ordinateur"
        width={2200}
        height={1250}
        sizes="(max-width: 1024px) 100vw, 960px"
        className="h-auto w-full object-contain"
      />
    </figure>
  );
}
