import { execSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.argv[2] || 3000);
const currentPid = String(process.pid);

function listeningPids(targetPort) {
  const pids = new Set();
  if (process.platform === "win32") {
    let out = "";
    try {
      out = execSync("netstat -ano", { encoding: "utf8" });
    } catch {
      return [];
    }
    for (const line of out.split(/\r?\n/)) {
      if (!/LISTENING/i.test(line)) continue;
      if (!line.includes(`:${targetPort}`) && !line.includes(`]:${targetPort}`)) continue;
      const m = line.match(/\s(\d+)\s*$/);
      const pid = m?.[1];
      if (pid && pid !== "0" && pid !== currentPid) pids.add(pid);
    }
    return [...pids];
  }

  try {
    const out = execSync(`lsof -ti tcp:${targetPort} -sTCP:LISTEN`, { encoding: "utf8" });
    return out
      .trim()
      .split(/\s+/)
      .filter((pid) => pid && pid !== currentPid);
  } catch {
    return [];
  }
}

function killPid(pid) {
  if (process.platform === "win32") {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    return;
  }
  try {
    process.kill(Number(pid), "SIGTERM");
  } catch {
    try {
      process.kill(Number(pid), "SIGKILL");
    } catch {
      /* already gone */
    }
  }
}

const pids = listeningPids(port);
for (const pid of pids) {
  try {
    killPid(pid);
    console.log(`Port ${port} libéré (PID ${pid}).`);
  } catch {
    console.warn(`Impossible d’arrêter le PID ${pid} sur le port ${port}.`);
  }
}

for (let i = 0; i < 10; i += 1) {
  if (listeningPids(port).length === 0) break;
  await delay(150);
}
