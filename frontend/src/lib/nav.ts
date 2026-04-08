export type NavItem = {
  title: string;
  url: string;
  isActive?: boolean;
  items?: NavItem[];
};

export const navMain: NavItem[] = [
  {
    title: "카드 찾기",
    url: "",
    items: [{ title: "전체 카드", url: "/cardlist" }],
  },

  {
    title: "덱 관리",
    url: "",
    items: [{ title: "덱 목록", url: "/decklist" }],
  },
  {
    title: "도구",
    url: "",
    items: [{ title: "멀리건 시뮬레이터", url: "/tools/mulligan" }],
  },
  {
    title: "정보",
    url: "",
    items: [{ title: "번역 커버리지", url: "/info" }],
  },
];

/** Returns [parentItem, childItem?] matching the given pathname. */
export function resolveBreadcrumb(
  pathname: string,
): [NavItem, NavItem?] | null {
  for (const parent of navMain) {
    if (parent.url !== "#" && parent.url === pathname) {
      return [parent];
    }
    for (const child of parent.items ?? []) {
      if (child.url !== "#" && child.url === pathname) {
        return [parent, child];
      }
    }
  }
  return null;
}
