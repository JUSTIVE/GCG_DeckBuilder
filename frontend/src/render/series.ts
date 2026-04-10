import i18n from "@/i18n";

export function renderSeries(series: string): string {
  return i18n.t(`series.${series}`, { ns: "game", defaultValue: series });
}
