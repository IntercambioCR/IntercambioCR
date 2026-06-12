import { createWriteStream } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const mode = process.argv[2] === "start" ? "start" : "dev";
const port = process.env.PORT ?? "3000";
const log = createWriteStream(join(process.cwd(), `${mode}-server.log`), { flags: "a" });

function write(message) {
  log.write(`[${new Date().toISOString()}] ${message}\n`);
}

write(`Iniciando Next en modo ${mode}, puerto ${port}.`);

const child = spawn(
  "C:\\Program Files\\nodejs\\node.exe",
  ["node_modules\\next\\dist\\bin\\next", mode, "-p", port],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  }
);

child.stdout.on("data", (chunk) => log.write(chunk));
child.stderr.on("data", (chunk) => log.write(chunk));
child.on("exit", (code, signal) => {
  write(`Next terminó. code=${code ?? "null"} signal=${signal ?? "null"}`);
  process.exit(code ?? 1);
});

process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));

setInterval(() => {
  write("Servidor activo.");
}, 60_000);
