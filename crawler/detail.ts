import * as cheerio from "cheerio";
import type {
  BaseCard,
  Card,
  CardColor,
  CardKeyword,
  CardPackage,
  CardTrait,
  CommandCard,
  GundamSeries,
  LinkPilot,
  LinkTrait,
  PilotCard,
  ResourceCard,
  UnitCard,
  Zone,
  PlayableCard,
} from "../data/dataTypes";
import CardList from "./cards.json";
import pLimit from "p-limit";
import { writeFile } from "node:fs/promises";
import type { CardRarity } from "../data/dataTypes";

const BASE = "https://www.gundam-gcg.com/en/cards/";

const RARITY_MAP: Record<string, CardRarity> = {
  "C": "COMMON",
  "U": "UNCOMMON",
  "R": "RARE",
  "LR": "LEGENDARY_RARE",
  "C+": "COMMON_PLUS",
  "U+": "UNCOMMON_PLUS",
  "R+": "RARE_PLUS",
  "LR+": "LEGENDARY_RARE_PLUS",
  "C++": "COMMON_PLUS_PLUS",
  "LR++": "LEGENDARY_RARE_PLUS_PLUS",
  "P": "P",
};

const VALID_TRAITS = new Set<string>([
  "ACADEMY", "OZ", "NEO_ZEON", "ZEON", "EARTH_ALLIANCE", "EARTH_FEDERATION",
  "MAGANAC_CORPS", "ZAFT", "OPERATION_METEOR", "NEWTYPE", "COORDINATOR",
  "CYBER_NEWTYPE", "STRONGHOLD", "WARSHIP", "TRIPLE_SHIP_ALLIANCE", "CIVILIAN",
  "WHITE_BASE_TEAM", "G_TEAM", "VANADIS_INSTITUTE", "ORB", "TEKKADAN",
  "TEIWAZ", "GJALLARHORN", "GUNDAM_FRAME", "ALAYA_VIJNANA", "TITANS",
  "VULTURE", "AEUG", "CLAN", "AGE_SYSTEM", "WHITE_FANG", "SIDE_6",
  "NEW_UNE", "UE", "VAGAN", "BIOLOGICAL_CPU", "ASUNO_FAMILY", "X_ROUNDER",
  "SUPERPOWER_BLOC", "CB", "INNOVADE", "GN_DRIVE", "SUPER_SOLDIER", "MAFTY",
  "SRA", "OLD_UNE", "JUPITRIS", "CYCLOPS_TEAM", "UN", "MINERVA_SQUAD",
]);

function toTraitKey(s: string): string {
  return s.replaceAll(" ", "_").replaceAll("-", "_").toUpperCase()
    .replaceAll("ENHANCED_HUMAN", "CYBER_NEWTYPE");
}
function field($: cheerio.CheerioAPI, label: string) {
  return $(`dt.dataTit:contains("${label}")`).next("dd").text().trim();
}

function parsePlayableCardSchema(html: string): PlayableCard {
  const $ = cheerio.load(html);
  const id = $(".cardNo").text().trim();
  const rarity = RARITY_MAP[$(".rarity").text().replaceAll(" ", "").replaceAll("\n", "")];
  const block = $(".blockIcon").text().trim();
  const name = $(".cardName").text().trim();
  const level = Number(field($, "Lv."));
  const cost = Number(field($, "COST"));
  const color: CardColor = field($, "COLOR").toUpperCase() as CardColor;

  const description = $(".overview .dataTxt")
    .html()!
    .split("<br>")
    .map((v) => cheerio.load(v).text().trim())
    .filter(Boolean)
    .filter((x) => x !== "-");
  const keywords = [...description.join(" ").matchAll(/[【<](.*?)[】>]/g)]
    .map(
      (v) =>
        v[1]
          ?.replace(/\d/, "")
          .trim()
          .toUpperCase()
          .replaceAll(" ", "_")
          .replaceAll("-", "_")
          .replaceAll("･", "_") as CardKeyword,
    )
    .map((x) => (x.includes("WHEN_LINKED") ? "WHEN_LINKED" : x))
    .map((x) => (x.includes("WHEN_PAIRED") ? "WHEN_PAIRED" : x))
    .map((x) => (x.includes("DURING_LINK") ? "DURING_LINK" : x))
    .map((x) => (x.includes("DURING_PAIR") ? "DURING_PAIR" : x));
  const series: GundamSeries = field($, "Source Title")
    .replaceAll(" ", "_")
    .replaceAll("-", "_")
    .replaceAll(":", "")
    .replaceAll("'", "")
    .toUpperCase() as GundamSeries;
  const trait = [...field($, "Trait").matchAll(/\((.*?)\)/g)].map(
    (m) => toTraitKey(m[1] ?? ""),
  ) as CardTrait[];

  const relatedTrait = [...new Set(
    [...description.join(" ").matchAll(/\((.*?)\)/g)]
      .map((m) => toTraitKey(m[1] ?? ""))
      .filter((t) => VALID_TRAITS.has(t) && !trait.includes(t as CardTrait)),
  )] as CardTrait[];

  return {
    id,
    name,
    rarity,
    block,
    level,
    cost,
    color,
    keywords,
    series,
    package: id.slice(0, 4) as CardPackage,
    trait,
    relatedTrait,
    description,
  };
}

function parseUnitCard(html: string): UnitCard {
  const $ = cheerio.load(html);
  const AP = Number(field($, "AP"));
  const HP = Number(field($, "HP"));

  const zone: Zone[] = field($, "Zone")
    .split(/\s+/)
    .map((z) => z.toUpperCase())
    .filter((x) => x !== "-") as Zone[];

  const linkText = field($, "Link");
  const link: LinkTrait | LinkPilot | undefined =
    linkText == null || linkText === "-"
      ? undefined
      : linkText.includes("Trait")
        ? ({
            __typename: "LinkTrait" as const,
            trait: [...linkText.matchAll(/[\(\[](.*?)[\)\]]/g)]
              .flat()
              .at(1)
              ?.replaceAll(" ", "_")
              ?.replaceAll("-", "_")
              ?.toUpperCase()
              .replaceAll("ENHANCED_HUMAN", "CYBER_NEWTYPE") as CardTrait,
          } as LinkTrait)
        : {
            __typename: "LinkPilot" as const,
            pilotName: linkText.replace(/[\[\]]/g, ""),
          };
  return {
    ...parsePlayableCardSchema(html),
    __typename: "UnitCard",
    AP,
    HP,
    link,
    zone,
  };
}

function parseBaseCard(html: string): BaseCard {
  const $ = cheerio.load(html);
  const AP = Number(field($, "AP"));
  const HP = Number(field($, "HP"));
  const zone: Zone[] = field($, "Zone")
    .split(/\s+/)
    .map((z) => z.toUpperCase())
    .filter((x) => x !== "-") as Zone[];
  return {
    ...parsePlayableCardSchema(html),
    __typename: "BaseCard",
    AP,
    HP,
    zone,
  };
}

function parseCommandCard(html: string): CommandCard {
  const $ = cheerio.load(html);

  const _ = parsePlayableCardSchema(html);

  const pilot: CommandCard["pilot"] = _.keywords.includes("PILOT")
    ? ({
        AP: Number(field($, "AP")),
        HP: Number(field($, "HP")),
        name:
          _.description
            .filter((x) => x.includes("Pilot"))
            .map((x) => [...x.matchAll(/\((.*?)\)/g)].flat().at(1))
            .at(0) ?? "",
      } satisfies CommandCard["pilot"])
    : undefined;

  return {
    ..._,
    __typename: "CommandCard",
    pilot,
  };
}
function parsePilotCard(html: string): PilotCard {
  const $ = cheerio.load(html);
  const AP = Number(field($, "AP"));
  const HP = Number(field($, "HP"));
  return {
    ...parsePlayableCardSchema(html),
    __typename: "PilotCard",
    AP,
    HP,
  };
}

function parseResourceCard(html: string): ResourceCard {
  const $ = cheerio.load(html);
  const id = $(".cardNo").text().trim();
  const name = $(".cardName").text().trim();
  return {
    __typename: "ResourceCard",
    id,
    name,
  };
}

function parseCard(html: string): Card {
  const $ = cheerio.load(html);
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

  switch (type) {
    case "UnitCard":
      return parseUnitCard(html);
    case "BaseCard":
      return parseBaseCard(html);
    case "CommandCard":
      return parseCommandCard(html);
    case "PilotCard":
      return parsePilotCard(html);
    case "ResourceCard":
      return parseResourceCard(html);
  }
}

async function fetchCard(cardUrl: string): Promise<Card> {
  const url = `${BASE}${cardUrl}`;
  const res = await (await fetch(url)).text();
  const card = parseCard(res);
  const imageFile = new URLSearchParams(cardUrl.split("?")[1]).get("detailSearch") ?? card.id;
  return { ...card, imageFile };
}

const limit = pLimit(3);

let completed = 0;

const dedupe = [...new Set(CardList)];

const total = dedupe.length;

const rawData = await Promise.all(
  dedupe.map((id) =>
    limit(async () => {
      const res = await fetchCard(id);

      completed++;

      const percent = ((completed / total) * 100).toFixed(1);

      process.stdout.write(`\r${completed}/${total} (${percent}%)`);
      return res;
    }),
  ),
);

await writeFile("../data/raw.json", JSON.stringify(rawData, null, 2), "utf-8");
