import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dataDir = "./data";
const outPath = "./combined.json";

const files = (await readdir(dataDir))
  .filter((f) => f.endsWith(".json"))
  .map((f) => join(dataDir, f));

const arrays = await Promise.all(
  files.map(async (f) => {
    const text = await readFile(f, "utf-8");
    return JSON.parse(text) as unknown[];
  }),
);

const combined = arrays.flat().toSorted((a, b) => {
  const ai = (a as { id?: string }).id ?? "";
  const bi = (b as { id?: string }).id ?? "";
  return ai.localeCompare(bi);
});

await writeFile(outPath, JSON.stringify(combined, null, 2), "utf-8");

console.log(`✓ merged ${files.length} files → ${combined.length} cards → ${outPath}`);
