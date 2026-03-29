export function renderPackage(pkg: string): string {
  switch (pkg) {
    case "GD01":
      return "부스트팩 1";
    case "GD02":
      return "부스트팩 2";
    case "GD03":
      return "부스트팩 3";
    case "ST01":
      return "스타터덱 1";
    case "ST02":
      return "스타터덱 2";
    case "ST03":
      return "스타터덱 3";
    case "ST04":
      return "스타터덱 4";
    case "ST05":
      return "스타터덱 5";
    case "ST06":
      return "스타터덱 6";
    case "ST07":
      return "스타터덱 7";
    case "ST08":
      return "스타터덱 8";
    case "ST09":
      return "스타터덱 9";
    case "OTHER_PRODUCT_CARD":
      return "기타 상품 카드";
    case "EDITION_BETA":
      return "베타 에디션";
    case "BASIC_CARDS":
      return "기본 카드";
    case "PROMOTION_CARD":
      return "프로모션 카드";
    default:
      return pkg;
  }
}
