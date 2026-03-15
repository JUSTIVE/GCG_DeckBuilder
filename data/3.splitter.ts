import CardList from "./mapped.json";
import { writeFile } from "node:fs/promises";

Object.entries(
  Object.groupBy(
    CardList.filter((x) => x.package != null),
    (x) => x.package,
  ),
).map(async ([pack, cards]) => {
  await writeFile(
    `./data/${pack}.json`,
    JSON.stringify(
      cards?.toSorted((x, y) => x.id.localeCompare(y.id)),
      null,
      2,
    ),
    "utf-8",
  );
});
