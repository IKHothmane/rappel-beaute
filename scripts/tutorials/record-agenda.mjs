import { createServer } from "vite";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.resolve(process.argv[2] || ".tmp/tutorials/agenda-creer-rendez-vous.mp4");
const ffmpeg = process.env.TUTORIAL_FFMPEG_PATH || "ffmpeg";
const fps = 10;
await fs.mkdir(path.dirname(output), { recursive: true });
const server = await createServer({
  configFile: false, root, esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.join(root, "src"), "next/link": path.join(root, "scripts/tutorials/next-shim.tsx"), "next/navigation": path.join(root, "scripts/tutorials/next-shim.tsx") } },
  server: { host: "127.0.0.1", port: 3115, strictPort: true },
});
let browser;
let encoder;
let recording;
let stop = false;
let frames = 0;
const chapters = [];
try {
  await server.listen();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && message.text().includes("Maximum update depth")) errors.push(message.text()); });
  await page.goto("http://127.0.0.1:3115/scripts/tutorials/agenda-preview.html");
  await page.getByRole("button", { name: "Nouveau rendez-vous", exact: true }).waitFor();
  await page.waitForTimeout(1500);
  if (errors.length) throw new Error(errors.join("\n"));
  encoder = spawn(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", String(fps), "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output]);
  let encoderError;
  let encoderLog = "";
  encoder.on("error", error => { encoderError = error; });
  encoder.stdin.on("error", error => { encoderError = error; });
  encoder.stderr.on("data", chunk => { encoderLog = (encoderLog + chunk).slice(-4000); });
  const finished = new Promise(resolve => encoder.once("close", code => resolve(code)));
  recording = (async () => {
    while (!stop) {
      if (encoderError) throw encoderError;
      const start = performance.now();
      const frame = await page.screenshot({ type: "jpeg", quality: 88 });
      if (!encoder.stdin.write(frame)) await once(encoder.stdin, "drain");
      frames += 1;
      await page.waitForTimeout(Math.max(0, 1000 / fps - (performance.now() - start)));
    }
  })();
  async function caption(title, text) {
    chapters.push({ start: frames / fps, title, text });
    await page.evaluate(({ title, text }) => { document.querySelector("#video-caption h2").textContent = title; document.querySelector("#video-caption p").textContent = text; }, { title, text });
    console.log(title);
  }
  async function click(locator) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error("Contrôle invisible pendant l’enregistrement");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 16 });
    await page.waitForTimeout(350);
    await locator.click();
    await page.waitForTimeout(450);
  }
  await caption("Créer un rendez-vous", "Un exemple complet dans l’Agenda Rappel Beauty. Les données utilisées sont fictives.");
  await page.waitForTimeout(3500);
  await caption("1 · Ouvrir le formulaire", "Cliquez sur « Nouveau rendez-vous » en haut de votre agenda.");
  await click(page.getByRole("button", { name: "Nouveau rendez-vous", exact: true }));
  await page.waitForTimeout(2500);
  await caption("2 · Renseigner la cliente", "Choisissez une cliente existante ou ajoutez son nom et son numéro de téléphone.");
  await click(page.getByRole("button", { name: "Nouvelle cliente", exact: true }).first());
  await page.getByPlaceholder("Prénom Nom").pressSequentially("Cliente Démonstration", { delay: 75 });
  await page.getByPlaceholder("0655443322").pressSequentially("0600000000", { delay: 100 });
  await page.waitForTimeout(2200);
  await caption("3 · Choisir la prestation", "Sélectionnez le service. Sa durée et son prix sont automatiquement repris dans le rendez-vous.");
  await click(page.locator('[data-agenda-tour="service"] button[aria-haspopup="listbox"]'));
  await click(page.getByRole("option", { name: /Soin visage/ }));
  await page.waitForTimeout(2500);
  await caption("4 · Affecter une praticienne", "Choisissez la personne qui réalisera le soin.");
  await click(page.locator('[data-agenda-tour="staff"] > button'));
  await click(page.getByRole("option", { name: "Nadia", exact: true }));
  await page.waitForTimeout(2200);
  await caption("5 · Choisir la cabine", "Sélectionnez une cabine si votre prestation nécessite une ressource.");
  await click(page.locator('[data-agenda-tour="resource"] > button'));
  await click(page.getByRole("option", { name: /Cabine 1/ }));
  await page.waitForTimeout(2200);
  await caption("6 · Indiquer la date", "Saisissez une date au format JJ/MM/AAAA ou utilisez le calendrier.");
  const date = new Date(); date.setDate(date.getDate() + 7);
  await page.locator("#appointment-date").fill(date.toLocaleDateString("fr-FR"));
  await page.waitForTimeout(2800);
  await caption("7 · Sélectionner l’heure", "Cliquez sur un créneau disponible. Les disponibilités dépendent du soin, de la praticienne et de la cabine.");
  await click(page.locator('[data-agenda-tour="slots"]').getByRole("button", { name: "10:00", exact: true }));
  await page.waitForTimeout(2800);
  await caption("8 · Vérifier le prix", "Le prix du soin est déjà renseigné. Ajustez-le si nécessaire avant de valider.");
  await click(page.locator('[data-agenda-tour="price"] input'));
  await page.waitForTimeout(2800);
  await caption("9 · Valider le rendez-vous", "En utilisation normale, cliquez sur « Créer le rendez-vous ». Ici, le mode démonstration empêche tout enregistrement.");
  await page.locator('[data-agenda-tour="save"]').scrollIntoViewIfNeeded();
  const save = await page.locator('[data-agenda-tour="save"]').boundingBox();
  await page.mouse.move(save.x + save.width / 2, save.y + save.height / 2, { steps: 16 });
  await page.waitForTimeout(4200);
  await caption("Vous êtes prêt !", "Ouvrez votre Agenda pour ajouter votre prochain rendez-vous. Vous pouvez revoir cette démonstration à votre rythme.");
  await page.waitForTimeout(3500);
  if (errors.length) throw new Error(errors.join("\n"));
  stop = true;
  await recording;
  encoder.stdin.end();
  const code = await finished;
  if (code !== 0) throw new Error(encoderLog || `FFmpeg exit ${code}`);
  await page.screenshot({ path: output.replace(/\.mp4$/, ".jpg"), type: "jpeg", quality: 90 });
  await fs.writeFile(output.replace(/\.mp4$/, ".json"), JSON.stringify({ duration: frames / fps, width: 1440, height: 900, fps, audio: false, demonstration: true, chapters }, null, 2));
  console.log(JSON.stringify({ output, seconds: frames / fps, bytes: (await fs.stat(output)).size }));
} finally {
  stop = true;
  if (recording) await recording.catch(() => {});
  if (encoder && !encoder.killed) encoder.kill();
  await browser?.close();
  await server.close();
}
