import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const pathsToRemove = [
  ".next",
  ".turbo",
  "tsconfig.tsbuildinfo"
].map((path) => join(process.cwd(), path));

for (const path of pathsToRemove) {
  if (!existsSync(path)) {
    continue;
  }

  rmSync(path, { force: true, recursive: true });
  console.log(`Eliminado: ${path}`);
}

console.log("Cache local de desarrollo limpiada. Si el navegador sigue mostrando una version vieja, recarga con Ctrl+F5.");
