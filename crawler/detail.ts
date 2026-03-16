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
import type z from "zod";

const BASE = "https://www.gundam-gcg.com/en/cards/";
function field($: cheerio.CheerioAPI, label: string) {
  return $(`dt.dataTit:contains("${label}")`).next("dd").text().trim();
}

function parsePlayableCardSchema(html: string): PlayableCard {
  const $ = cheerio.load(html);
  const id = $(".cardNo").text().trim();
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
  const trait = [...field($, "Trait").matchAll(/\((.*?)\)/g)].map((m) =>
    m[1]
      ?.replaceAll(" ", "_")
      ?.replaceAll("-", "_")
      ?.toUpperCase()
      .replaceAll("ENHANCED_HUMAN", "CYBER_NEWTYPE"),
  ) as CardTrait[];

  return {
    name,
    level,
    cost,
    color,
    keywords,
    series,
    package: id.slice(0, 4) as CardPackage,
    trait,
    description,
  };
}

function parseUnitCard(html: string): UnitCard {
  const $ = cheerio.load(html);
  const id = $(".cardNo").text().trim();
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
    id,
    AP,
    HP,
    link,
    zone,
  };
}

function parseBaseCard(html: string): BaseCard {
  const $ = cheerio.load(html);
  const id = $(".cardNo").text().trim();
  const AP = Number(field($, "AP"));
  const HP = Number(field($, "HP"));
  const zone: Zone[] = field($, "Zone")
    .split(/\s+/)
    .map((z) => z.toUpperCase())
    .filter((x) => x !== "-") as Zone[];
  return {
    ...parsePlayableCardSchema(html),
    __typename: "BaseCard",
    id,
    AP,
    HP,
    zone,
  };
}

function parseCommandCard(html: string): CommandCard {
  const $ = cheerio.load(html);
  const id = $(".cardNo").text().trim();

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
    id,
    pilot,
  };
}
function parsePilotCard(html: string): PilotCard {
  const $ = cheerio.load(html);
  const id = $(".cardNo").text().trim();
  const AP = Number(field($, "AP"));
  const HP = Number(field($, "HP"));
  return {
    ...parsePlayableCardSchema(html),
    __typename: "PilotCard",
    id,
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
  return parseCard(res);
}

const limit = pLimit(3);

let completed = 0;

const dedupe = [...new Set(CardList.map((x) => x.split("_")[0] ?? ""))];

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
