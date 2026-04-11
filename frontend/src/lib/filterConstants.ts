import { renderKeyword } from "@/render/keyword";
import { renderSeries } from "@/render/series";
import {
  ALL_KEYWORDS,
  ALL_KINDS,
  ALL_ZONES,
  ALL_COLORS,
  ALL_TRAITS,
  ALL_SERIES,
  type CardKeyword,
  type CardTrait,
  type CardSeries,
} from "@/lib/gameConstants";
import i18n from "@/i18n";

export { ALL_KEYWORDS, ALL_KINDS, ALL_ZONES, ALL_COLORS, ALL_TRAITS, ALL_SERIES };

export const SORT_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: "NAME_ASC", labelKey: "sort.NAME_ASC" },
  { value: "NAME_DESC", labelKey: "sort.NAME_DESC" },
  { value: "COST_ASC", labelKey: "sort.COST_ASC" },
  { value: "COST_DESC", labelKey: "sort.COST_DESC" },
  { value: "LEVEL_ASC", labelKey: "sort.LEVEL_ASC" },
  { value: "LEVEL_DESC", labelKey: "sort.LEVEL_DESC" },
  { value: "AP_ASC", labelKey: "sort.AP_ASC" },
  { value: "AP_DESC", labelKey: "sort.AP_DESC" },
  { value: "HP_ASC", labelKey: "sort.HP_ASC" },
  { value: "HP_DESC", labelKey: "sort.HP_DESC" },
];

export const getZoneLabel = (zone: string) =>
  i18n.t(`zone.${zone}`, { ns: "game", defaultValue: zone });
export const ZONE_LABELS: Record<string, string> = {
  SPACE: "우주",
  EARTH: "지구",
};
export const getColorLabel = (color: string) =>
  i18n.t(`color.${color}`, { ns: "game", defaultValue: color });
export const COLOR_LABELS: Record<string, string> = {
  BLUE: "파랑",
  GREEN: "초록",
  RED: "빨강",
  YELLOW: "노랑",
  PURPLE: "보라",
  WHITE: "하양",
};
export const getKindLabel = (kind: string) =>
  i18n.t(`kind.${kind}`, { ns: "game", defaultValue: kind });
export const KIND_LABELS: Record<string, string> = {
  UNIT: "유닛",
  PILOT: "파일럿",
  BASE: "베이스",
  COMMAND: "커맨드",
  RESOURCE: "리소스",
};
export const COST_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Compute at call-site (inside component render) for reactive language switching. */
export const getKeywordLabels = () =>
  Object.fromEntries(ALL_KEYWORDS.map((k) => [k, renderKeyword(k)])) as Record<CardKeyword, string>;
// Legacy static export — not reactive to language changes.
export const KEYWORD_LABELS = getKeywordLabels();

export const TRAIT_LABELS: Record<CardTrait, string> = {
  ACADEMY: "학원",
  OZ: "OZ",
  NEO_ZEON: "네오 지온",
  ZEON: "지온",
  EARTH_ALLIANCE: "지구 연합",
  EARTH_FEDERATION: "지구 연방",
  MAGANAC_CORPS: "마그아낙",
  ZAFT: "자프트",
  OPERATION_METEOR: "오퍼레이션 메테오",
  NEWTYPE: "뉴타입",
  COORDINATOR: "코디네이터",
  CYBER_NEWTYPE: "강화인간",
  STRONGHOLD: "거점",
  WARSHIP: "함선",
  TRIPLE_SHIP_ALLIANCE: "삼척동맹",
  CIVILIAN: "민간",
  WHITE_BASE_TEAM: "화이트베이스",
  G_TEAM: "G-팀",
  VANADIS_INSTITUTE: "바나디스",
  ORB: "오브",
  TEKKADAN: "철화단",
  TEIWAZ: "테이와즈",
  GJALLARHORN: "걀라르호른",
  GUNDAM_FRAME: "건담 프레임",
  ALAYA_VIJNANA: "아라야식",
  TITANS: "티탄즈",
  VULTURE: "벌쳐",
  AEUG: "에우고",
  CLAN: "클랜",
  AGE_SYSTEM: "AGE 시스템",
  WHITE_FANG: "화이트 팽",
  SIDE_6: "사이드 6",
  NEW_UNE: "신지구연방",
  UE: "UE",
  VAGAN: "베이건",
  BIOLOGICAL_CPU: "생체 CPU",
  ASUNO_FAMILY: "아스노 일가",
  X_ROUNDER: "X-라운더",
  SUPERPOWER_BLOC: "초대국군",
  CB: "솔레스탈 비잉",
  INNOVADE: "이노베이드",
  GN_DRIVE: "GN 드라이브",
  SUPER_SOLDIER: "초인병",
  MAFTY: "마프티",
  SRA: "우주혁명군",
  OLD_UNE: "지구연방군",
  JUPITRIS: "주피트리스",
  CYCLOPS_TEAM: "사이클롭스",
  UN: "UN",
  MINERVA_SQUAD: "미네르바",
};

export const getSeriesLabels = () =>
  Object.fromEntries(ALL_SERIES.map((s) => [s, renderSeries(s)])) as Record<CardSeries, string>;
export const SERIES_LABELS = getSeriesLabels();

export const getPackGroups = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (key: string) => (i18n.t as any)(key, { ns: "filters" }) as string;
  return [
    {
      label: t("packGroup.boosterPack"),
      items: [
        { value: "GD01", label: "GD01" },
        { value: "GD02", label: "GD02" },
        { value: "GD03", label: "GD03" },
      ],
    },
    {
      label: t("packGroup.starterDeck"),
      items: [
        { value: "ST01", label: "ST01" },
        { value: "ST02", label: "ST02" },
        { value: "ST03", label: "ST03" },
        { value: "ST04", label: "ST04" },
        { value: "ST05", label: "ST05" },
        { value: "ST06", label: "ST06" },
        { value: "ST07", label: "ST07" },
        { value: "ST08", label: "ST08" },
        { value: "ST09", label: "ST09" },
      ],
    },
    {
      label: t("packGroup.other"),
      items: [
        { value: "BASIC_CARDS", label: t("packItem.basic") },
        { value: "EDITION_BETA", label: t("packItem.beta") },
        { value: "PROMOTION_CARD", label: t("packItem.promo") },
        { value: "OTHER_PRODUCT_CARD", label: t("packItem.otherProduct") },
      ],
    },
  ];
};
// Legacy static export — not reactive to language changes.
export const PACK_GROUPS = getPackGroups();
