import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

// Explicit account, session and creation authorization are required for this real-account scenario.
const baseURL = process.env.TUTORIAL_BASE_URL;
const expectedOrg = process.env.TUTORIAL_EXPECTED_ORGANIZATION_ID;
const sessionFile = process.env.TUTORIAL_SESSION_PATH;
if (!baseURL || !expectedOrg || !sessionFile || process.env.TUTORIAL_ALLOW_CREATE !== "1") throw new Error("Configurez TUTORIAL_BASE_URL, TUTORIAL_EXPECTED_ORGANIZATION_ID, TUTORIAL_SESSION_PATH et TUTORIAL_ALLOW_CREATE=1.");
const output = path.resolve(process.argv[2] || ".tmp/tutorials/agenda-compte-test.mp4");
const receipt = output.replace(/\.mp4$/, "-created.json");
if (await fs.stat(receipt).catch(() => null)) throw new Error("Un rendez-vous a déjà été créé pour cet enregistrement. Vérifiez le reçu avant de relancer.");
const plan = JSON.parse(await fs.readFile(process.env.TUTORIAL_PLAN_PATH || ".tmp/agenda-online-plan.json", "utf8"));
await fs.mkdir(path.dirname(output), { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, storageState: sessionFile, viewport: { width: 1440, height: 900 } });
let encoder;
let recording;
let stop = false;
let frames = 0;
const chapters = [];
try {
  const sessionResponse = await context.request.get("/api/auth/session/");
  if (!sessionResponse.ok()) throw new Error("Session expirée.");
  const session = await sessionResponse.json();
  if (session.user?.organizationId !== expectedOrg || session.user?.scope !== "app") throw new Error("Le compte connecté n’est pas l’institut de test attendu.");
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("/agenda/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Nouveau rendez-vous", exact: true }).waitFor();
  await page.waitForTimeout(2000);
  const styles = await fs.readFile("scripts/tutorials/agenda-preview.css", "utf8");
  await page.addStyleTag({ content: styles.slice(styles.indexOf("#video-caption")) });
  await page.evaluate(() => {
    const caption = document.createElement("div"); caption.id = "video-caption";
    caption.innerHTML = "<small>Tutoriel Rappel Beauty · compte de test</small><h2>Créer un rendez-vous</h2><p>Un parcours complet dans votre agenda.</p>";
    caption.style.zoom = String(1 / (Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1));
    const cursor = document.createElement("div"); cursor.id = "video-cursor"; cursor.style.left = "-100px"; cursor.style.top = "-100px";
    cursor.style.zoom = caption.style.zoom;
    document.body.append(caption, cursor);
    document.addEventListener("mousemove", event => { cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`; });
    document.addEventListener("mousedown", () => { cursor.classList.remove("click"); void cursor.offsetWidth; cursor.classList.add("click"); });
  });
  encoder = spawn(process.env.TUTORIAL_FFMPEG_PATH || "ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", "10", "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output]);
  let encoderError;
  let encoderLog = "";
  encoder.on("error", error => { encoderError = error; });
  encoder.stdin.on("error", error => { encoderError = error; });
  encoder.stderr.on("data", chunk => { encoderLog = (encoderLog + chunk).slice(-3000); });
  const finished = new Promise(resolve => encoder.once("close", resolve));
  recording = (async () => { while (!stop) {
    if (encoderError) throw encoderError;
    const started = performance.now();
    if (!encoder.stdin.write(await page.screenshot({ type: "jpeg", quality: 90 }))) await once(encoder.stdin, "drain");
    frames += 1;
    await page.waitForTimeout(Math.max(0, 100 - (performance.now() - started)));
  } })();
  async function caption(title, text) {
    chapters.push({ start: frames / 10, title, text });
    await page.evaluate(({ title, text }) => { document.querySelector("#video-caption h2").textContent = title; document.querySelector("#video-caption p").textContent = text; }, { title, text });
    console.log(title);
  }
  async function click(locator) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox(); if (!box) throw new Error("Commande invisible");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
    await page.waitForTimeout(350); await locator.click(); await page.waitForTimeout(500);
  }
  await caption("Créer un rendez-vous", "Un exemple complet dans l’agenda du compte de test Institut Royal.");
  await page.waitForTimeout(3200);
  await caption("1 · Ouvrir le formulaire", "Cliquez sur Nouveau rendez-vous, en haut à droite de l’agenda.");
  await click(page.getByRole("button", { name: "Nouveau rendez-vous", exact: true }));
  const form = page.locator('aside[role="dialog"]');
  await page.getByRole("heading", { name: "Nouveau rendez-vous", exact: true }).waitFor();
  await page.waitForTimeout(1800);
  await caption("2 · Renseigner la cliente", "Sélectionnez une cliente existante ou indiquez le nom et le téléphone d’une nouvelle cliente.");
  await click(form.getByRole("button", { name: "Nouvelle cliente", exact: true }).first());
  await form.getByPlaceholder("Prénom Nom").pressSequentially("Tutoriel Agenda", { delay: 80 });
  await form.getByPlaceholder("0655443322").pressSequentially("0600000000", { delay: 100 });
  await page.waitForTimeout(2300);
  await caption("3 · Choisir la prestation", `Sélectionnez ${plan.serviceName}. La durée et le prix sont repris automatiquement.`);
  await click(form.locator('button[aria-haspopup="listbox"]').nth(0));
  await click(form.getByRole("option", { name: new RegExp(plan.serviceName) }));
  await page.waitForTimeout(2200);
  await caption("4 · Affecter la praticienne", `Choisissez ${plan.staffName} pour réaliser la prestation.`);
  await click(form.locator('button[aria-haspopup="listbox"]').nth(1));
  await click(form.getByRole("option", { name: plan.staffName, exact: true }));
  await page.waitForTimeout(2200);
  await caption("5 · Choisir la cabine", `Affectez ${plan.resourceName} au rendez-vous.`);
  await click(form.locator('button[aria-haspopup="listbox"]').nth(2));
  await click(form.getByRole("option", { name: new RegExp(plan.resourceName) }));
  await page.waitForTimeout(2200);
  await caption("6 · Choisir la date", `Indiquez le ${plan.dateFR}, au format JJ/MM/AAAA. Vous pouvez aussi utiliser le calendrier.`);
  await form.locator("#appointment-date").fill(plan.dateFR);
  await page.waitForTimeout(2300);
  await caption("7 · Choisir un créneau libre", `Sélectionnez ${plan.time}. Les créneaux tiennent compte des rendez-vous déjà présents et des ressources.`);
  await click(form.getByRole("button", { name: plan.time, exact: true }));
  await page.waitForTimeout(2400);
  await caption("8 · Vérifier les informations", `La prestation ${plan.serviceName} est proposée à ${plan.price} MAD. Vérifiez la cliente, la date, l’heure et le prix avant de valider.`);
  await page.waitForTimeout(3300);
  await caption("9 · Créer le rendez-vous", "Cliquez sur Créer le rendez-vous. L’application enregistre la cliente et réserve le créneau.");
  const creationResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/appointments/" && response.request().method() === "POST", { timeout: 30000 });
  await click(form.getByRole("button", { name: "Créer le rendez-vous", exact: true }));
  const response = await creationResponse;
  const appointment = await response.json();
  if (!response.ok()) throw new Error(appointment.error || "Création refusée");
  if (appointment.organizationId !== expectedOrg) throw new Error("Institut du rendez-vous inattendu");
  await fs.writeFile(receipt, JSON.stringify({ appointmentId: appointment.id, customerId: appointment.customerId, customerName: appointment.customerName, serviceName: appointment.serviceName, startAt: appointment.startAt, organizationId: appointment.organizationId, baseURL }, null, 2));
  console.log(JSON.stringify({ createdAppointmentId: appointment.id, startAt: appointment.startAt }));
  await form.waitFor({ state: "detached" });
  await caption("Le rendez-vous est enregistré", "Il apparaît maintenant dans votre agenda. Ouvrez sa fiche pour consulter les détails et suivre son statut.");
  // Advance only the displayed period, never an existing appointment.
  for (let count = 0; count < 3 && !(await page.getByText("Tutoriel Agenda", { exact: true }).first().isVisible().catch(() => false)); count++) {
    await click(page.getByRole("button", { name: "Période suivante", exact: true }));
    await page.waitForTimeout(900);
  }
  const createdCard = page.getByText("Tutoriel Agenda", { exact: true }).first();
  await createdCard.waitFor();
  await createdCard.scrollIntoViewIfNeeded();
  await page.evaluate(() => { const caption = document.getElementById("video-caption"); caption.style.bottom = "auto"; caption.style.top = "20px"; });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: output.replace(/\.mp4$/, ".jpg"), type: "jpeg", quality: 92 });
  const verify = await context.request.get(`/api/appointments/${appointment.id}/`);
  if (!verify.ok()) throw new Error("Vérification du rendez-vous impossible");
  stop = true; await recording; encoder.stdin.end();
  if (await finished !== 0) throw new Error(encoderLog || "Erreur FFmpeg");
  await fs.writeFile(output.replace(/\.mp4$/, ".json"), JSON.stringify({ duration: frames / 10, width: 1440, height: 900, audio: false, realAccount: true, chapters, pageErrors }, null, 2));
  console.log(JSON.stringify({ output, seconds: frames / 10, bytes: (await fs.stat(output)).size, verifiedAppointment: appointment.id }));
} finally {
  stop = true; if (recording) await recording.catch(() => {});
  if (encoder && !encoder.killed) encoder.kill();
  await browser.close();
}
