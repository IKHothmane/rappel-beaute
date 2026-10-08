export type VisitCardRow = {
  id: string;
  customerId: string;
  customerName: string;
  phone: string | null;
  visits: number;
  visitsPerReward: number;
  createdAt: string;
};

export function VisitCardsList({ cards }: { cards: VisitCardRow[] }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="text-[18px] font-bold text-ink">Cartes de fidélité</h3>
      <p className="mt-1 text-[13px] text-ink/55">
        La cliente scanne le QR de l&apos;institut sans se connecter. Sa carte apparaît ici, à 0 passage.
      </p>
      {cards.length === 0 ? (
        <p className="mt-3 text-sm text-ink/50">Aucune carte pour le moment.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#FFEFF8]">
          {cards.map((card) => (
            <li key={card.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{card.customerName}</p>
                <p className="text-[12px] text-ink/45">{card.phone || "Sans téléphone"}</p>
              </div>
              <p className="shrink-0 font-bold text-primary">
                {card.visits} / {card.visitsPerReward}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
