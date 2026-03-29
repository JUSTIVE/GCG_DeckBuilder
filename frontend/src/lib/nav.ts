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
    title: "도구",
    url: "",
    items: [{ title: "리소스 카운터", url: "/resource-counter" }],
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
