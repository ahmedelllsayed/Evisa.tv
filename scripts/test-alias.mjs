import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const file = resolvePath("src", specifier.slice(2));
    return next(pathToFileURL(file.endsWith(".ts") ? file : `${file}.ts`).href, context);
  }
  return next(specifier, context);
}
