import { formatMad } from "@/modules/finance/service";

type Props = {
  promotionCode?: string | null;
  promotionName?: string | null;
  discount?: number;
};

export function AppointmentPromoNote({ promotionCode, promotionName, discount = 0 }: Props) {
  const code = promotionCode?.trim();
  if (!code) return null;
  return (
    <p className="rounded-lg bg-[#FFEFF8] px-3 py-2 text-[13px] text-ink">
      Code promo <strong>{code}</strong>
      {promotionName ? <span className="text-ink/55"> · {promotionName}</span> : null}
      {discount > 0.009 ? (
        <span className="text-ink/70"> · réduction {formatMad(discount)} sur une prestation</span>
      ) : null}
    </p>
  );
}
