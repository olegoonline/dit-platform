"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Brand from "./Brand"
import ReserveModal from "./ReserveModal"
import { COUNTRIES, COUNTRY_FLAGS, countrySlug } from "../_lib/countries"

const LINKS = [
  { href: "/programs", label: "Programs" },
  { href: "/#tracks", label: "Key Outcomes" },
  { href: "/partners", label: "Partnership" },
  { href: "/start", label: "Assessment" },
  { href: "/about", label: "About" },
]

export default function TopNav({ programs = [] }: { programs?: { id: string; name: string }[] }) {
  const pathname = usePathname()
  const [destOpen, setDestOpen] = useState(false)
  const destActive = pathname.startsWith("/destinations") || pathname.startsWith("/properties")

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Brand size={36} />
        <nav className="topnav-links">
          <div
            className="topnav-dropdown"
            onMouseEnter={() => setDestOpen(true)}
            onMouseLeave={() => setDestOpen(false)}
          >
            <button
              type="button"
              className={"topnav-dropdown-trigger" + (destActive ? " active" : "")}
              onClick={() => setDestOpen((v) => !v)}
              aria-expanded={destOpen}
            >
              Destinations
            </button>
            {destOpen && (
              <div className="topnav-dropdown-menu">
                <Link href="/destinations" onClick={() => setDestOpen(false)}>
                  All destinations
                </Link>
                <Link href="/properties" onClick={() => setDestOpen(false)}>
                  All properties
                </Link>
                <div className="topnav-dropdown-divider" />
                {COUNTRIES.map((c) => (
                  <Link key={c} href={"/destinations/" + countrySlug(c)} onClick={() => setDestOpen(false)}>
                    {(COUNTRY_FLAGS[c] ?? "") + " " + c}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {LINKS.map((l) => {
            const active = l.href.startsWith("/#") ? false : pathname.startsWith(l.href)
            return (
              <Link key={l.label} href={l.href} className={active ? "active" : ""}>
                {l.label}
              </Link>
            )
          })}
        </nav>
        <ReserveModal programs={programs} triggerLabel="Book now" triggerClassName="btn btn-ghost topnav-cta" />
        <Link href="/start" className="btn btn-primary topnav-cta">
          Take Assessment
        </Link>
      </div>
    </header>
  )
}
