import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase-server"
import Brand from "./Brand"
import { Icon } from "./Icon"

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/start", label: "Wellness Baseline" },
  { href: "mailto:hello@dreamislands.org", label: "Press kit", external: true },
]

const CONTACT_LINKS = [
  { href: "https://wa.me/message/HOF2AFIBDYY5J1", label: "WhatsApp consult", external: true },
  { href: "mailto:hello@dreamislands.org", label: "hello@dreamislands.org", external: true },
  { href: "https://instagram.com/", label: "Instagram", external: true },
  { href: "https://t.me/", label: "Telegram", external: true },
]

const COUNTRY_FLAGS: Record<string, string> = {
  Thailand: "🇹🇭",
  China: "🇨🇳",
  Indonesia: "🇮🇩",
  Singapore: "🇸🇬",
  Philippines: "🇵🇭",
  Vietnam: "🇻🇳",
  Malaysia: "🇲🇾",
}

type Link = { href: string; label: string; external?: boolean }

export default async function Footer() {
  const { data: propRows } = await supabaseAdmin
    .from("properties")
    .select("island, country")
    .eq("active", true)
    .is("parent_id", null)
    .neq("name", "")

  const countries = [...new Set((propRows ?? []).map((p) => p.country).filter(Boolean))] as string[]

  const { data: progRows } = await supabaseAdmin
    .from("programs")
    .select("name, slug")
    .eq("active", true)
    .eq("status", "published")
    .order("sort_order")
    .limit(6)

  const programLinks: Link[] = (progRows ?? [])
    .filter((p) => p.slug)
    .map((p) => ({ href: `/programs/${p.slug}`, label: p.name }))

  const exploreLinks: Link[] = [
    { href: "/properties", label: "Destinations" },
    { href: "/properties", label: "Properties" },
    { href: "/programs", label: "Programs" },
    { href: "/#tracks", label: "Key Outcomes" },
    { href: "/partners", label: "Partnership / B2B / MICE" },
  ]

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Brand size={36} />
          <p className="body" style={{ marginTop: 16, maxWidth: 320 }}>
            The AI-matched wellness travel platform for Southeast Asia. Baseline first, retreat
            second, measured outcomes third.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            <a
              href="https://wa.me/message/HOF2AFIBDYY5J1"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ padding: "12px 18px", fontSize: 13 }}
            >
              <Icon.wa width={16} height={16} /> Message us
            </a>
            <Link
              href="/start"
              className="btn btn-ghost"
              style={{ padding: "12px 18px", fontSize: 13 }}
            >
              Take baseline
            </Link>
          </div>
        </div>

        <FooterCol title="Explore" links={exploreLinks} />
        <FooterCol title="Featured programs" links={programLinks} />
        <FooterCol title="Company" links={COMPANY_LINKS} />
        <FooterCol title="Stay in touch" links={CONTACT_LINKS} />
      </div>

      <div className="footer-locations">
        <div className="eyebrow" style={{ marginBottom: 10 }}>We host in</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center" }}>
          {countries.map((c) => (
            <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ink-2)", fontSize: 14 }}>
              <span style={{ fontSize: 18 }}>{COUNTRY_FLAGS[c] ?? ""}</span>
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="footer-legal">
        <div className="footer-legal-grid">
          <div>
            <div style={{ fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}>
              DREAM ISLANDS SIAM CO., LTD. <span style={{ color: "var(--ink-3)" }}>(Reg. No. 0845567002281)</span>
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
              <a href="https://dreamislands.org" className="footer-link">dreamislands.org</a>
              <span style={{ color: "var(--ink-3)" }}>/</span>
              <a href="https://dreamislands.ru" target="_blank" rel="noreferrer" className="footer-link">dreamislands.ru</a>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}>Disclaimer</div>
            <p className="body-sm" style={{ margin: "0 0 8px", maxWidth: 480 }}>
              Dream Islands operates as a Destination Marketing Organization (DMO) promoting
              wellness travel. We do not provide medical or psychiatric services and are not a
              medical institution.
            </p>
            <p className="body-sm" style={{ margin: 0, maxWidth: 480 }}>
              Content on this site is for informational purposes only and does not constitute
              medical advice or a prescription. Please consult your doctor before making any
              health-related decisions.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}>Contacts</div>
            <div className="body-sm" style={{ marginBottom: 4 }}>AI assistant, 24/7</div>
            <div className="body-sm" style={{ marginBottom: 4 }}>
              WhatsApp / Telegram{" "}
              <a href="https://wa.me/66811612662" target="_blank" rel="noreferrer" className="footer-link">
                +66 81 161 2662
              </a>
            </div>
            <div className="body-sm">
              <Link href="/partners" className="footer-link">Partnership / B2B / MICE</Link> — Singapore-based company
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div>© {new Date().getFullYear()} Dream Islands Travel · WBS v1</div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <a href="#" className="footer-link">Privacy</a>
          <a href="#" className="footer-link">Terms</a>
          <a href="mailto:hello@dreamislands.org" className="footer-link">Contact</a>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: Link[] }) {
  if (links.length === 0) return null
  return (
    <div className="footer-col">
      <div className="eyebrow" style={{ marginBottom: 14 }}>{title}</div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {links.map((l) => (
          <li key={l.href + l.label}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noreferrer" className="footer-link">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="footer-link">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
