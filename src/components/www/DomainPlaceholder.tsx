type Props = {
  host: string;
  title: string;
  text: string;
  accent: "gold" | "primary";
  dark?: boolean;
};

export function DomainPlaceholder({ host, title, text, accent, dark }: Props) {
  return (
    <main
      className={`flex min-h-screen items-center justify-center px-6 ${dark ? "bg-[#120e14] text-white" : "bg-institut text-white"}`}
    >
      <div className="max-w-md">
        <p
          className={`font-mono text-[11px] uppercase tracking-[0.18em] ${accent === "gold" ? "text-gold" : "text-primary"}`}
        >
          {host}
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">{text}</p>
        <p className="mt-6 font-mono text-xs text-white/40">
          Développement : ajoutez ?__host=www pour revenir à la vitrine
        </p>
      </div>
    </main>
  );
}
