import { readFileSync } from "fs";
import { resolve } from "path";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const raw = readFileSync(resolve(import.meta.dir, "../../data/3.processed.json"), "utf-8");
const cards = JSON.parse(raw) as Array<Record<string, unknown>>;

function mapCard(c: Record<string, unknown>) {
  const name = c["name"] as { en?: string; ko?: string } | string | undefined;
  const nameEn = typeof name === "object" ? (name?.en ?? "") : (name ?? "");
  const nameKo = typeof name === "object" ? (name?.ko ?? "") : (name ?? "");

  return {
    id: c["id"] as string,
    typename: c["__typename"] as string,
    name_en: nameEn,
    name_ko: nameKo,
    color: (c["color"] as string | undefined) ?? null,
    level: (c["level"] as number | undefined) ?? null,
    cost: (c["cost"] as number | undefined) ?? null,
    ap: (c["AP"] as number | undefined) ?? null,
    hp: (c["HP"] as number | undefined) ?? null,
    rarity: (c["rarity"] as string) ?? "",
    package: (c["package"] as string | undefined) ?? "",
    series: (c["series"] as string | undefined) ?? null,
    traits: (c["trait"] as string[] | undefined) ?? [],
    keywords: (c["keywords"] as string[] | undefined) ?? [],
    zone: (c["zone"] as string[] | undefined) ?? [],
    image_file: (c["imageFile"] as string | undefined) ?? null,
    raw: c,
  };
}

async function main() {
  const BATCH = 100;
  let inserted = 0;

  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH).map(mapCard);

    const values = batch.map((_, j) => {
      const base = j * 17;
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16},$${base+17})`;
    }).join(",");

    const params = batch.flatMap((c) => [
      c.id, c.typename, c.name_en, c.name_ko,
      c.color, c.level, c.cost, c.ap, c.hp,
      c.rarity, c.package, c.series,
      c.traits, c.keywords, c.zone,
      c.image_file, JSON.stringify(c.raw),
    ]);

    await pool.query(`
      INSERT INTO cards
        (id, typename, name_en, name_ko, color, level, cost, ap, hp,
         rarity, package, series, traits, keywords, zone, image_file, raw)
      VALUES ${values}
      ON CONFLICT (id) DO UPDATE SET
        typename   = EXCLUDED.typename,
        name_en    = EXCLUDED.name_en,
        name_ko    = EXCLUDED.name_ko,
        color      = EXCLUDED.color,
        level      = EXCLUDED.level,
        cost       = EXCLUDED.cost,
        ap         = EXCLUDED.ap,
        hp         = EXCLUDED.hp,
        rarity     = EXCLUDED.rarity,
        package    = EXCLUDED.package,
        series     = EXCLUDED.series,
        traits     = EXCLUDED.traits,
        keywords   = EXCLUDED.keywords,
        zone       = EXCLUDED.zone,
        image_file = EXCLUDED.image_file,
        raw        = EXCLUDED.raw
    `, params);

    inserted += batch.length;
    console.log(`${inserted} / ${cards.length}`);
  }

  await pool.end();
  console.log("done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
