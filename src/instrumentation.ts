export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMemoryDiagnosticsInterval } = await import("@/lib/ops/memory");
    startMemoryDiagnosticsInterval();
  }
}
