import raw from "./raw.json";
import { writeFile } from "node:fs/promises";
import effects from "./effects.json";
import pilotnames from "./pilotnames.json";
import unitnames from "./unitnames.json";
import basenames from "./basenames.json";
import commandnames from "./commandnames.json";
import descriptions from "./descriptionmap.json";

const pilotNameEntries = Object.entries(pilotnames);
const effectEntries = Object.entries(effects);
const allEntries = [...effectEntries, ...pilotNameEntries];

function maps(target: string, kvMap: [string, string][]): string {
  return kvMap.reduce((acc, [k, v]) => acc.replaceAll(k, v), target);
}

const pilotAndEffectNameMapper = (raw: unknown[]) =>
  raw
    .map((x) => {
      if (x.description == null) return x;

      return {
        ...x,
        description: x.description.map((x) => maps(x, allEntries)),
      };
    })
    .map((x) => {
      if (x.name == null) return x;
      return {
        ...x,
        name: maps(x.name, pilotNameEntries),
      };
    })
    .map((x) => {
      if (x?.link?.pilotName == null) return x;
      return {
        ...x,
        link: {
          ...x.link,
          pilotName: maps(x.link.pilotName, pilotNameEntries),
        },
      };
    });

const unitNameMapper = (raw: unknown[]) => {
  return raw.map((x) => {
    if (x.name == null && x.__typename !== "UnitCard") return x;

    return {
      ...x,
      name: unitnames[x.name] ?? x.name,
    };
  });
};

const baseNameMapper = (raw: unknown[]) => {
  return raw.map((x) => {
    if (x.name == null && x.__typename !== "BaseCard") return x;
    return {
      ...x,
      name: basenames[x.name] ?? x.name,
    };
  });
};

const commandNameMapper = (raw: unknown[]) => {
  return raw.map((x) => {
    if (x.name == null && x.__typename !== "CommandCard") return x;
    return {
      ...x,
      name: commandnames[x.name] ?? x.name,
    };
  });
};

const descriptionLineMapper = (raw: unknown[]) =>
  raw.map((x) => {
    if (x.description == null) return x;
    return {
      ...x,
      description: x.description.map((line: string) => descriptions[line] ?? line),
    };
  });

await writeFile(
  "../data/mapped.json",
  JSON.stringify(
    descriptionLineMapper(pilotAndEffectNameMapper(commandNameMapper(baseNameMapper(unitNameMapper(raw))))),
    null,
    2,
  ),
  "utf-8",
);
