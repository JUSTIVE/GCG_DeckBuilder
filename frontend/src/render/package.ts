import i18n from "@/i18n";

export function renderPackage(pkg: string): string {
  return i18n.t(`pack.${pkg}`, { ns: "game", defaultValue: pkg });
}
