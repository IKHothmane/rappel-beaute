export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Sharp/libvips : cache interne inutile sur un serveur (variantes uniques)
    // et concurrency 1 = moins de buffers natifs en parallèle.
    try {
      const sharp = (await import("sharp")).default;
      sharp.cache(false);
      sharp.concurrency(1);
    } catch {
      // sharp absent / non chargeable — next/image ou uploads tomberont ailleurs
    }

    const { startMemoryDiagnosticsInterval } = await import("@/lib/ops/memory");
    startMemoryDiagnosticsInterval();
  }
}
