import * as cheerio from "cheerio";
import pLimit from "p-limit";
import CardList from "./cards.json";

const BASE = "https://www.gundam-gcg.com/en/cards/";

const dedupe = [...new Set(CardList)];
const limit = pLimit(5);
const rarities = new Set<string>();
let completed = 0;

await Promise.all(
  dedupe.map((id) =>
    limit(async () => {
      const html = await fetch(`${BASE}${id}`).then((r) => r.text());
      const $ = cheerio.load(html);
      const raw = $(".rarity").html();
      const rarity = $(".rarity").text().replaceAll(" ", "").replaceAll("\n", "");
      if (rarity && !rarities.has(rarity)) {
        rarities.add(rarity);
        console.log(`\n[${rarity}] HTML: ${raw}`);
      }
      completed++;
      process.stdout.write(`\r${completed}/${dedupe.length}`);
    }),
  ),
);

console.log("\n\n발견된 rarity 값들:");
for (const r of [...rarities].sort()) {
  console.log(` - "${r}"`);
}
