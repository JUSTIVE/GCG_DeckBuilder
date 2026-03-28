import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FileSearchCorner } from "lucide-react";

type NavItemProps = {
  icon: ReactNode;
  label: string;
  link: string;
};
function NavItem({ icon, label, link }: NavItemProps) {
  return (
    <Link to={link}>
      <div className="flex flex-col items-center text-white">
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
}

export function GlobalNavigation() {
  return (
    <div className="fixed bottom-0 flex justify-between items-center left-1/2 -translate-x-1/2 max-w-[1080px] w-screen px-4 py-2 bg-gray-100/50 ">
      <NavItem icon={<FileSearchCorner />} label="카드 목록" link="/" />
    </div>
  );
}
