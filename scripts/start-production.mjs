import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT || "3000";

if (!/^\d+$/.test(port)) {
  console.error(`PORT debe ser un numero valido. Valor recibido: ${port}`);
  process.exit(1);
}

const server = spawn(process.execPath, [nextBin, "start", "-H", "0.0.0.0", "-p", port], {
  cwd: root,
  env: process.env,
  stdio: "inherit"
});

server.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

server.on("error", (error) => {
  console.error("No se pudo iniciar Next.js en produccion:", error);
  process.exit(1);
});
