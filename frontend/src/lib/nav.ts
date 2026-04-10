export type NavItem = {
  titleKey: string;
  /** Path relative to locale prefix, e.g. "/cardlist". Prepend /$locale at render time. */
  path: string;
  isActive?: boolean;
  items?: NavItem[];
};

export const navMain: NavItem[] = [
  {
    titleKey: "nav.cardSearch",
    path: "",
    items: [{ titleKey: "nav.allCards", path: "/cardlist" }],
  },
  {
    titleKey: "nav.deckManagement",
    path: "",
    items: [{ titleKey: "nav.deckList", path: "/decklist" }],
  },
  {
    titleKey: "nav.tools",
    path: "",
    items: [{ titleKey: "nav.mulliganSimulator", path: "/tools/mulligan" }],
  },
  {
    titleKey: "nav.info",
    path: "",
    items: [
      { titleKey: "nav.gameRules", path: "/rules" },
      { titleKey: "nav.keywordDictionary", path: "/keywords" },
      { titleKey: "nav.translationCoverage", path: "/info" },
    ],
  },
];

/** Returns [parentItem, childItem?] matching the given path (without locale prefix). */
export function resolveBreadcrumb(
  pathname: string,
): [NavItem, NavItem?] | null {
  // Strip locale prefix: "/ko/cardlist" → "/cardlist"
  const stripped = pathname.replace(/^\/(ko|en|jp)/, "") || "/";
  for (const parent of navMain) {
    if (parent.path && parent.path === stripped) return [parent];
    for (const child of parent.items ?? []) {
      if (child.path && child.path === stripped) return [parent, child];
    }
  }
  return null;
}
