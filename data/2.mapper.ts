import raw from "./raw.json";
import { writeFile } from "node:fs/promises";
import effects from "./effects.json";
import names from "./pilotnames.json";

const nameEntries = Object.entries(names);
const effectEntries = Object.entries(effects);
const allEntries = [...effectEntries, ...nameEntries];

function maps(target: string[], kvMap: [string, string][]): string[] {
  return kvMap.reduce((acc, [k, v]) => acc.replaceAll(k, v), target);
}

const mapped = raw
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
      name: maps(x.name, nameEntries),
    };
  })
  .map((x) => {
    if (x?.link?.pilotName == null) return x;
    return {
      ...x,
      link: {
        ...x.link,
        pilotName: maps(x.link.pilotName, nameEntries),
      },
    };
  });

await writeFile("../data/mapped.json", JSON.stringify(mapped, null, 2), "utf-8");
