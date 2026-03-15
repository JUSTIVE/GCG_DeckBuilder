import * as cheerio from "cheerio";
import { writeFile } from "node:fs/promises";

const BASE = "https://www.gundam-gcg.com/en/cards/";

async function fetchPackage(packageId: number) {
  const url = `${BASE}?package=${packageId}`;

  const res = await fetch(url);
  const html = await res.text();

  const $ = cheerio.load(html);

  const cards: string[] = [];

  $(".cardInner > .cardItem > .cardStr").each((_, el) => {
    const srd = $(el).attr("data-src");
    if (srd) cards.push(srd);
  });

  return cards;
}
const packages = [
  616000, // Edition beta
  //ST
  616001, // ST01
  616002,
  616003,
  616004,
  616005,
  616006,
  616007,
  616008,
  616009,
  //BOOST
  616101,
  616102,
  616103,
  616701, // other product
  616801, // basic
  616901, // promo
];
async function crawl() {
  const allCards: string[] = [];

  for (const pkg of packages) {
    const cards = await fetchPackage(pkg);
    allCards.push(...cards);
  }

  await writeFile("cards.json", JSON.stringify(allCards, null, 2), "utf-8");
}

crawl();
