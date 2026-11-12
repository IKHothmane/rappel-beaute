import { ReceiptPrinter } from "@/components/ui/receipt-printer";
import "./morocco-payments.css";
import { Banknote, Check, Coins, CreditCard, MessageCircle, Wallet } from "lucide-react";

const features = [
  {
    title: "Montants en dirhams",
    description: "Prix, caisse, commissions et rapports en MAD, sans conversion.",
    icon: Coins,
  },
  {
    title: "Espèces, carte et virement",
    description: "Fond de caisse, sorties et clôture avec rapprochement des espèces comptées.",
    icon: CreditCard,
  },
  {
    title: "WhatsApp d'abord",
    description: "Rappels, confirmations et promotions sur le canal que vos clientes lisent.",
    icon: MessageCircle,
  },
];

const RECEIPT_ITEMS = [
  { name: "Massage relaxant à l'argan", qty: 1, price: 250 },
  { name: "Épilation sourcils au fil", qty: 1, price: 60 },
  { name: "Soin hydrafacial visage", qty: 1, price: 160 },
];

const PRINTER_LABELS = {
  idle: "Appuyez sur PRINT",
  printing: "Impression… appuyez pour arrêter",
  ready: "Tirez pour détacher, ou imprimez encore",
};

export default function MoroccoPaymentsSection() {
  return (
    <section
      id="maroc"
      aria-labelledby="morocco-payments-heading"
      className="morocco-payments relative isolate overflow-x-clip bg-vt-surface py-14 lg:py-16"
    >
      <div className="morocco-layout mx-auto grid max-w-[1200px] items-center gap-8 px-6 lg:grid-cols-2 lg:gap-10 lg:px-8">
        {/* Texte et fonctionnalités */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-widest text-vt-primary-rich">
            <Wallet aria-hidden="true" size={16} />
            Conçu au Maroc
          </span>

          <h2
            id="morocco-payments-heading"
            className="mt-6 font-serif font-semibold leading-[1.12] tracking-tight text-vt-ink-deep"
          >
            Pensé pour la façon
            <br />
            dont <span className="italic text-vt-primary-rich">vous encaissez</span>
          </h2>

          <p className="mt-6 max-w-[550px] text-base leading-8 text-[#765569] sm:text-lg">
            Rappel Beauty part de la réalité d’un institut marocain, pas d’un logiciel européen
            traduit à la hâte.
          </p>

          <div className="mt-9 space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group flex items-center gap-4 rounded-2xl border border-[#efd9e2] bg-white/85 p-5 shadow-[0_8px_28px_rgba(105,25,65,0.04)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#e8a8c2] hover:shadow-lg"
                  style={{
                    transitionDelay: `${index * 60}ms`,
                  }}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-vt-surface-soft text-vt-primary-rich">
                    <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-vt-ink-deep">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#7b596b]">{feature.description}</p>
                  </div>

                  <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vt-surface-soft text-vt-primary-rich sm:flex">
                    <Check aria-hidden="true" size={19} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Machine à tickets */}
        <div className="relative mx-auto flex w-full max-w-[600px] flex-col items-center pt-6">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-[12%] h-[420px] w-[420px] max-w-full -translate-x-1/2 rounded-full bg-pink-200/55 blur-3xl"
          />

          <div className="relative z-10 flex w-full flex-col items-center">
            <div className="h-[620px] w-full max-w-[440px]">
              <ReceiptPrinter
                embedded
                autoPrint
                store="Institut Royal"
                address="Aicha Chahbi · Ticket de caisse"
                items={RECEIPT_ITEMS}
                currency="MAD"
                currencyPosition="suffix"
                taxRate={0}
                thanks="MERCI"
                startOrder={317}
                dateLocale="fr-FR"
                mark="Rappel"
                labels={PRINTER_LABELS}
              />
            </div>

            {/* Informations */}
            <div className="relative z-10 mt-8 flex max-w-full items-center gap-3 rounded-2xl border border-pink-200 bg-white/90 px-5 py-4 text-sm text-[#60384c] shadow-sm">
              <span className="rounded-full bg-vt-surface-soft p-2 text-vt-primary-rich">
                <Banknote aria-hidden="true" size={20} />
              </span>
              <span>
                Praticienne : <strong>Nadia B.</strong>
                <br />
                Commission <strong className="text-vt-primary-rich">12 %</strong> calculée
                automatiquement
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
