#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, ".agents/tooling.json"), "utf8"));
const name = process.argv[2];
const server = manifest.stdioServers[name];
if (!server) { console.error(`Unknown project MCP server: ${name || "(missing)"}`); process.exit(1); }
if (process.argv.includes("--check")) {
  console.log(JSON.stringify({ name, package: server.package, version: server.version, args: server.args }));
  process.exit(0);
}

// Pass the OS/runtime environment and only the credentials needed by the selected server.
const allowed = new Set(["PATH", "Path", "PATHEXT", "SystemRoot", "SYSTEMROOT", "WINDIR", "COMSPEC", "ComSpec", "APPDATA", "LOCALAPPDATA", "USERPROFILE", "HOME", "HOMEDRIVE", "HOMEPATH", "TEMP", "TMP", "TMPDIR", "PROGRAMFILES", "PROGRAMFILES(X86)", "ProgramFiles", "ProgramFiles(x86)", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "LANG", "LC_ALL"]);
if (name === "context7") allowed.add("CONTEXT7_API_KEY");
if (name === "railway") for (const key of ["RAILWAY_TOKEN", "RAILWAY_API_TOKEN", "RAILWAY_AGENT_SESSION", "RAILWAY_CALLER"]) allowed.add(key);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key)));
env.NPM_CONFIG_UPDATE_NOTIFIER = "false";

let command = process.execPath;
let args;
const globalRailway = process.env.APPDATA && path.join(process.env.APPDATA, "npm/node_modules/@railway/cli");
if (name === "railway" && globalRailway && fs.existsSync(path.join(globalRailway,"package.json"))) {
  const pkg = JSON.parse(fs.readFileSync(path.join(globalRailway,"package.json"),"utf8"));
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.railway;
  if (!bin || pkg.version !== server.version) { console.error("Railway CLI version differs from the verified project version. Review .agents/tooling.json before updating."); process.exit(1); }
  args = [path.join(globalRailway,bin), ...server.args];
} else {
  const npmCandidates = [path.join(path.dirname(process.execPath),"node_modules/npm/bin/npx-cli.js"), "/usr/share/nodejs/npm/bin/npx-cli.js", "/usr/local/lib/node_modules/npm/bin/npx-cli.js"];
  const npx = npmCandidates.find(candidate => fs.existsSync(candidate));
  if (npx) args = [npx,"--yes",`${server.package}@${server.version}`,...server.args];
  else if (process.platform !== "win32") { command = "npx"; args = ["--yes",`${server.package}@${server.version}`,...server.args]; }
  else { console.error("Cannot locate npm's npx-cli.js next to Node. Repair the Node/npm installation."); process.exit(1); }
}
const child = spawn(command,args,{ cwd:root, env, stdio:"inherit", windowsHide:true });
child.on("error", error => { console.error(`[${name}] ${error.message}`); process.exitCode = 1; });
child.on("exit", (code,signal) => { process.exitCode = code ?? (signal === "SIGTERM" ? 143 : 1); });
for (const signal of ["SIGINT","SIGTERM"]) process.on(signal,() => child.kill(signal));
