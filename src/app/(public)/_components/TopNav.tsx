"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Brand from "./Brand"

const LINKS = [
  { href: "/properties", label: "Destinations" },
  { href: "/properties", label: "Properties" },
  { href: "/programs", label: "Programs" },
  { href: "/#tracks", label: "Key Outcomes" },
  { href: "/partners", label: "Partnership" },
  { href: "/start", label: "Assessment" },
  { href: "/about", label: "About" },
]

export default function TopNav() {
  const pathname = usePathname()
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Brand size={36} />
        <nav className="topnav-links">
          {LINKS.map((l) => {
            const active = l.href.startsWith("/#") ? false : pathname.startsWith(l.href)
            return (
              <Link key={l.label} href={l.href} className={active ? "active" : ""}>
                {l.label}
              </Link>
            )
          })}
        </nav>
        <Link href="/start" className="btn btn-primary topnav-cta">
          Take Assessment
        </Link>
      </div>
    </header>
  )
}
