import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) walk(path, out);
    else if (name.name.endsWith(".tsx")) out.push(path);
  }
  return out;
}

const needle = 'import type { Page } from "@/lib/page";';
for (const file of walk("src/app")) {
  const text = readFileSync(file, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  let seen = false;
  const next = lines.filter((line) => {
    if (line === needle) {
      if (seen) return false;
      seen = true;
    }
    return true;
  });
  const joined = next.join(eol);
  if (joined !== text) {
    writeFileSync(file, joined);
    console.log("deduped", file);
  }
}
