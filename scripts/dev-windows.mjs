import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

const PORT = "3000";

function stopPort(port) {
  try {
    execFileSync(process.execPath, [join(process.cwd(), "scripts", "stop-next-port.mjs"), port], {
      stdio: "inherit"
    });
  } catch {
    console.error(`No se puede arrancar limpio mientras el puerto ${port} siga ocupado.`);
    process.exit(1);
  }
}

function cleanNext() {
  for (const path of [".next", ".turbo", "tsconfig.tsbuildinfo"]) {
    rmSync(join(process.cwd(), path), { force: true, recursive: true });
  }

  console.log("Cache local de desarrollo limpiada.");
}

stopPort(PORT);
cleanNext();

const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const dev = spawn(process.execPath, [nextBin, "dev", "--hostname", "localhost", "-p", PORT], {
  stdio: "inherit",
  shell: false
});

dev.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
