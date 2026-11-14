import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

// Applied before Node/Sharp load, including when Railway invokes npm start.
const env = { ...process.env };
env.MALLOC_ARENA_MAX ||= "2";
env.VIPS_CONCURRENCY ||= "1";
env.UV_THREADPOOL_SIZE ||= "2";

if (process.platform === "linux" && !env.LD_PRELOAD) {
  env.LD_PRELOAD = [
    "/usr/lib/x86_64-linux-gnu/libjemalloc.so.2",
    "/usr/lib/aarch64-linux-gnu/libjemalloc.so.2",
    "/usr/lib/libjemalloc.so.2",
    "/lib/x86_64-linux-gnu/libjemalloc.so.2",
  ].find(existsSync);
  if (!env.LD_PRELOAD) delete env.LD_PRELOAD;
}

const heapMb = env.NODE_MAX_OLD_SPACE_SIZE || "512";
if (!/^[1-9]\d*$/.test(heapMb) || !Number.isSafeInteger(Number(heapMb))) {
  throw new Error("NODE_MAX_OLD_SPACE_SIZE must be a positive integer in MiB");
}

console.info("[STARTUP]", {
  oldSpaceMb: Number(heapMb),
  jemalloc: Boolean(env.LD_PRELOAD?.includes("jemalloc")),
  mallocArenaMax: env.MALLOC_ARENA_MAX,
  vipsConcurrency: env.VIPS_CONCURRENCY,
  uvThreadpoolSize: env.UV_THREADPOOL_SIZE,
});

const child = spawn(process.execPath, [
  `--max-old-space-size=${heapMb}`,
  "./node_modules/next/dist/bin/next",
  "start",
  ...process.argv.slice(2),
], { env, stdio: "inherit" });

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error("[STARTUP] Next.js failed to start:", error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGTERM" ? 143 : signal === "SIGINT" ? 130 : 1);
});
