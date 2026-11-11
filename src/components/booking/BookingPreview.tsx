"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Sparkles } from "lucide-react";

const SERVICES = ["Soin du visage", "Manucure", "Massage relaxant"];
const HOURS = ["10:00", "11:00", "14:00", "16:00"];

/** A local demonstration only, independent of live availability and booking APIs. */
export function BookingPreview() {
  const [service, setService] = useState(SERVICES[0]);
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("11:00");
  const [selection, setSelection] = useState<string | null>(null);
  function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formatted = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(`${date}T12:00:00`));
    setSelection(`${service}, le ${formatted} à ${hour}.`);
  }
  return (
    <section className="bk-demo" aria-labelledby="booking-preview-title"><h3 id="booking-preview-title">Préparez votre soin</h3><p>Un exemple interactif de sélection, sans réservation réelle.</p><form onSubmit={preview}><label htmlFor="booking-demo-service" className="sr-only">Choisir une prestation</label><div className="bk-demo-input"><Sparkles aria-hidden="true" /><select id="booking-demo-service" value={service} onChange={event => { setService(event.target.value); setSelection(null); }}>{SERVICES.map(item => <option key={item}>{item}</option>)}</select></div><label htmlFor="booking-demo-date" className="sr-only">Choisir une date</label><div className="bk-demo-input"><CalendarDays aria-hidden="true" /><input id="booking-demo-date" type="date" value={date} required onChange={event => { setDate(event.target.value); setSelection(null); }} /></div><fieldset><legend><Clock3 aria-hidden="true" />Choisir un horaire d’exemple</legend><div className="bk-demo-hours">{HOURS.map(item => <label key={item}><input type="radio" name="booking-demo-hour" value={item} checked={hour === item} onChange={() => { setHour(item); setSelection(null); }} /><span>{item}</span></label>)}</div></fieldset><button type="submit">Voir ma sélection<ArrowRight aria-hidden="true" /></button>{selection && <p className="bk-demo-result" role="status"><CheckCircle2 aria-hidden="true" /><span>Votre aperçu : {selection}</span></p>}</form><Link href="/professionnel/">Activer pour mon institut<ArrowRight aria-hidden="true" /></Link></section>
  );
}
