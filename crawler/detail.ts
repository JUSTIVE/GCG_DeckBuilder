import * as cheerio from "cheerio";
import type {
  Card,
  CardColor,
  CardPackage,
  CardRarity,
  CardTrait,
  GundamSeries,
  UnitLink,
  Zone,
} from "../data/dataTypes";
import CardList from "./cards.json";
import pLimit from "p-limit";
import { writeFile } from "node:fs/promises";

const BASE = "https://www.gundam-gcg.com/en/cards/";
function field($: cheerio.CheerioAPI, label: string) {
  return $(`dt.dataTit:contains("${label}")`).next("dd").text().trim();
}

export function parseCard(html: string): Card {
  const $ = cheerio.load(html);

  const id = $(".cardNo").text().trim();
  const name = $(".cardName").text().trim();

  const level = Number(field($, "Lv."));
  const cost = Number(field($, "COST"));

  const color: CardColor = field($, "COLOR").toUpperCase() as CardColor;

  const rawType = field($, "TYPE");
  const type: Card["__typename"] =
    rawType === "UNIT"
      ? ("UnitCard" as const)
      : rawType === "BASE"
        ? ("BaseCard" as const)
        : rawType === "PILOT"
          ? ("PilotCard" as const)
          : rawType === "COMMAND"
            ? ("CommandCard" as const)
            : ("ResourceCard" as const);

  const rarityMap: Record<string, CardRarity> = {
    C: "COMMON",
    U: "UNCOMMON",
    R: "RARE",
    LR: "LEGENDARY_RARE",
    "C+": "COMMON_PLUS",
    "U+": "UNCOMMON_PLUS",
    "R+": "RARE_PLUS",
    "LR+": "LEGENDARY_RARE_PLUS",
    "C++": "COMMON_PLUS_PLUS",
    "LR++": "LEGENDARY_RARE_PLUS_PLUS",
    P: "P",
  };

  const rarity: CardRarity = rarityMap[
    $(".rarity").text().trim().replaceAll(" ", "")
  ] as CardRarity;

  const zone: Zone[] = field($, "Zone")
    .split(/\s+/)
    .map((z) => z.toUpperCase()) as Zone[];

  const AP = Number(field($, "AP"));
  const HP = Number(field($, "HP"));

  const description = $(".overview .dataTxt")
    .html()!
    .split("<br>")
    .map((v) => cheerio.load(v).text().trim())
    .filter(Boolean);

  const series: GundamSeries = field($, "Source Title")
    .replaceAll(" ", "_")
    .replaceAll("-", "_")
    .replaceAll(":", "")
    .replaceAll("'", "")
    .toUpperCase() as GundamSeries;

  const trait = [...field($, "Trait").matchAll(/\((.*?)\)/g)].map((m) =>
    m[1]
      ?.replace(/[\(\)]/, "")
      ?.replaceAll(" ", "_")
      ?.toUpperCase(),
  ) as CardTrait[];

  const linkText = field($, "Link");

  const links: UnitLink[] = linkText ? [{ pilot: linkText.replace(/[\[\]]/g, "") }] : [];

  return {
    __typename: type,
    id,
    name,
    level,
    cost,
    series,
    color,
    rarity,
    package: id.slice(0, 4) as CardPackage,
    keywords: [],
    zone,
    AP,
    HP,
    links,
    trait,
    description,
  };
}

async function fetchCard(cardUrl: string): Promise<Card> {
  const url = `${BASE}${cardUrl}`;
  const res = await (await fetch(url)).text();
  return parseCard(res);
}

const limit = pLimit(3);

let completed = 0;
const total = CardList.length;

const res = await Promise.all(
  CardList.map((id) =>
    limit(async () => {
      const res = await fetchCard(id);

      completed++;

      const percent = ((completed / total) * 100).toFixed(1);

      process.stdout.write(`\r${completed}/${total} (${percent}%)`);
      return res;
    }),
  ),
);
await writeFile("../data/raw.json", JSON.stringify(res, null, 2), "utf-8");
