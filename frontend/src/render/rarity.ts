export function renderRarity(rarity: string): string {
  switch (rarity) {
    case "COMMON":
      return "C";
    case "UNCOMMON":
      return "U";
    case "RARE":
      return "R";
    case "LEGENDARY_RARE":
      return "LR";
    case "COMMON_PLUS":
      return "C+";
    case "UNCOMMON_PLUS":
      return "U+";
    case "RARE_PLUS":
      return "R+";
    case "LEGENDARY_RARE_PLUS":
      return "LR+";
    case "COMMON_PLUS_PLUS":
      return "C++";
    case "LEGENDARY_RARE_PLUS_PLUS":
      return "LR++";
    case "P":
      return "P";
    default:
      return "";
  }
}
