import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const publicDir = resolve(root, "storefront-public");
if (!publicDir.startsWith(`${root}${process.platform === "win32" ? "\\" : "/"}`)) {
  throw new Error("Refusing to copy assets outside the project directory");
}
mkdirSync(resolve(publicDir, "assets"), { recursive: true });
cpSync(resolve(root, "storefront-catalog.json"), resolve(publicDir, "storefront-catalog.json"));
cpSync(resolve(root, "assets/menu"), resolve(publicDir, "assets/menu"), { recursive: true });
