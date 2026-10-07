import { renameSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "dist-public");
const source = resolve(output, "storefront-entry.html");
const target = resolve(output, "index.html");
if (!output.startsWith(`${root}${process.platform === "win32" ? "\\" : "/"}`)) {
  throw new Error("Refusing to finalize output outside the project directory");
}
statSync(source);
renameSync(source, target);
