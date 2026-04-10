import type { CardListSearch, CardTrait } from "@/routes/$locale/cardlist";
import { COLOR_HEX } from "src/render/color";
import { renderTrait } from "@/render/trait";
import { renderSeries } from "@/render/series";
import { renderPackage } from "@/render/package";
import { CardDescription } from "@/components/CardDescription";
import { KeywordContent } from "./KeywordPanel";
import { useTranslation } from "react-i18next";

export function PilotCardDetail({
  node,
  navigateWithFilter,
}: {
  node: any;
  navigateWithFilter: (filter: Partial<CardListSearch>) => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="pointer-events-auto max-h-[80dvh] w-72 overflow-y-auto rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/20 cursor-pointer hover:scale-125 transition-transform" style={{ background: COLOR_HEX[node.color ?? ""] ?? "#000" }} onClick={() => navigateWithFilter({ color: [node.color as any] })} />
          <h2 className="text-sm font-bold leading-tight">{node.pilot?.name}</h2>
        </div>
        <div className="text-xs text-white/60">{node.id}</div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
          <span>Lv {node.level}</span>
          <span>{t("card.cost", { value: node.cost })}</span>
          <span>AP {node.pilot?.AP}</span>
          <span>HP {node.pilot?.HP}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
        <span>{renderSeries(node.series ?? "")}</span>
        <button type="button" className="hover:text-white cursor-pointer" onClick={() => navigateWithFilter({ package: node.package as any })}>
          {renderPackage(node.package ?? "")}
        </button>
      </div>

      {(node.traits?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{t("card.trait")}</span>
          <div className="flex flex-wrap gap-1">
            {(node.traits ?? []).map((t: string) => (
              <button key={t} type="button" onClick={() => navigateWithFilter({ trait: [t as CardTrait] })} className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer">
                {renderTrait(t)}
              </button>
            ))}
          </div>
        </div>
      )}
      {(node.relatedTraits?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{t("card.relatedTrait")}</span>
          <div className="flex flex-wrap gap-1">
            {(node.relatedTraits ?? []).map((t: string) => (
              <button key={t} type="button" onClick={() => navigateWithFilter({ trait: [t as CardTrait] })} className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer">
                {renderTrait(t)}
              </button>
            ))}
          </div>
        </div>
      )}

      {(node.description?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{t("card.effect")}</span>
          <CardDescription lines={node.description ?? []} />
        </div>
      )}
      {(node.keywords?.length ?? 0) > 0 && (
        <div className="sm:hidden">
          <KeywordContent keywords={(node.keywords as string[] | undefined) ?? []} />
        </div>
      )}
    </div>
  );
}
