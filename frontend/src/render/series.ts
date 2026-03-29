export function renderSeries(series: string): string {
  switch (series) {
    case "MOBILE_SUIT_GUNDAM":
      return "기동전사 건담";
    case "MOBILE_SUIT_Z_GUNDAM":
      return "기동전사 Z 건담";
    case "MOBILE_SUIT_GUNDAM_CHARS_COUNTERATTACK":
      return "기동전사 건담 샤아의 역습";
    case "MOBILE_SUIT_GUNDAM_0080_WAR_IN_THE_POCKET":
      return "기동전사 건담 0080";
    case "MOBILE_SUIT_GUNDAM_WING":
      return "신기동전기 건담 W";
    case "AFTER_WAR_GUNDAM_X":
      return "기동신세기 건담 X";
    case "MOBILE_SUIT_GUNDAM_SEED":
      return "기동전사 건담 SEED";
    case "MOBILE_SUIT_GUNDAM_SEED_DESTINY":
      return "기동전사 건담 SEED Destiny";
    case "MOBILE_SUIT_GUNDAM_00":
      return "기동전사 건담 00";
    case "MOBILE_SUIT_GUNDAM_UNICORN":
      return "기동전사 건담 유니콘";
    case "MOBILE_SUIT_GUNDAM_AGE":
      return "기동전사 건담 AGE";
    case "MOBILE_SUIT_GUNDAM_IRON_BLOODED_ORPHANS":
      return "기동전사 건담 철혈의 오펀스";
    case "MOBILE_SUIT_GUNDAM_HATHAWAYS_FLASH":
      return "기동전사 건담 섬광의 하사웨이";
    case "MOBILE_SUIT_GUNDAM_THE_WITCH_FROM_MERCURY":
      return "기동전사 건담 수성의 마녀";
    case "MOBILE_SUIT_GUNDAM_GQUUUUUUX":
      return "기동전사 건담 GQUUUUUUX";
    default:
      return series;
  }
}
