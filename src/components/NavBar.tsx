"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/today", label: "Today" },
  { href: "/checkin", label: "Check-in" },
  { href: "/weekly-block", label: "Weekly block" },
  { href: "/intake", label: "Profile" },
];

export default function NavBar() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <nav className="nav-bar" aria-label="Primary">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="nav-link"
          aria-current={pathname.startsWith(link.href) ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
