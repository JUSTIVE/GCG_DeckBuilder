export type NavItem = {
  title: string;
  url: string;
  isActive?: boolean;
  items?: NavItem[];
};

export const navMain: NavItem[] = [
  {
    title: "카드 찾기",
    url: "/cardlist",
    items: [
      { title: "Installation", url: "/" },
      { title: "Project Structure", url: "#" },
    ],
  },
  {
    title: "Build Your Application",
    url: "#",
    items: [
      { title: "Routing", url: "#" },
      { title: "Data Fetching", url: "#", isActive: true },
      { title: "Rendering", url: "#" },
      { title: "Caching", url: "#" },
      { title: "Styling", url: "#" },
      { title: "Optimizing", url: "#" },
      { title: "Configuring", url: "#" },
      { title: "Testing", url: "#" },
      { title: "Authentication", url: "#" },
      { title: "Deploying", url: "#" },
      { title: "Upgrading", url: "#" },
      { title: "Examples", url: "#" },
    ],
  },
  {
    title: "API Reference",
    url: "#",
    items: [
      { title: "Components", url: "#" },
      { title: "File Conventions", url: "#" },
      { title: "Functions", url: "#" },
      { title: "next.config.js Options", url: "#" },
      { title: "CLI", url: "#" },
      { title: "Edge Runtime", url: "#" },
    ],
  },
  {
    title: "Architecture",
    url: "#",
    items: [
      { title: "Accessibility", url: "#" },
      { title: "Fast Refresh", url: "#" },
      { title: "Next.js Compiler", url: "#" },
      { title: "Supported Browsers", url: "#" },
      { title: "Turbopack", url: "#" },
    ],
  },
  {
    title: "Community",
    url: "#",
    items: [{ title: "Contribution Guide", url: "#" }],
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
