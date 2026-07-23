import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase-server"
import { Icon } from "../_components/Icon"

export const dynamic = "force-dynamic"

const WHAT_WE_DO: Array<[string, string]> = [
  ["Baseline first", "Every guest starts with a 22-question wellness score. No assumptions."],
  ["AI-matched, not guessed", "Your baseline is matched to programs by fit, not by who bought the most ads."],
  ["Outcomes, not just itineraries", "We check in before, during and after — so the next match gets sharper too."],
  ["Human handoff", "A real coordinator on WhatsApp from inquiry through arrival and beyond."],
  ["No upsell loop", "One transparent price, full inclusions, and a clear protocol on paper."],
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

type LocationRow = {
  id: string
  name: string
  island: string | null
  country: string | null
}

export default async function AboutPage() {
  const { data: propRows } = await supabaseAdmin
    .from("properties")
    .select("id, name, island, country")
    .eq("active", true)
    .is("parent_id", null)
    .neq("name", "")
    .order("country")

  const locations = (propRows ?? []) as LocationRow[]
  const countryCount = new Set(locations.map((l) => l.country).filter(Boolean)).size

  const { count: programCount } = await supabaseAdmin
    .from("programs")
    .select("id", { count: "exact", head: true })
    .eq("active", true)
    .eq("status", "published")

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <section className="shell" style={{ paddingTop: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>About Dream Islands</div>
        <h1
          className="display"
          style={{ fontSize: "clamp(40px, 10vw, 72px)", margin: "0 0 24px", color: "var(--ink)" }}
        >
          The <span className="display-italic">Strava</span> for wellness travel.
        </h1>
        <p className="body-lg" style={{ marginBottom: 20, maxWidth: 760 }}>
          We match you to the island wellness program that actually fits your goals — not the one
          with the best photos. Every stay starts with a real baseline, adapts while you&apos;re
          there, and gets checked again after you&apos;re home. One trip becomes a measured
          journey, not a one-off.
        </p>
        <p className="body-lg" style={{ marginBottom: 32, maxWidth: 760 }}>
          Today that means {locations.length} partner destinations across {countryCount} countries
          in Southeast Asia and {programCount ?? "40+"} standardized programs — all matched, tracked
          and followed up the same way, wherever you go.
        </p>

        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>What we do differently</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 14 }}>
            {WHAT_WE_DO.map(([t, b]) => (
              <li key={t} style={{ display: "flex", gap: 14 }}>
                <span
                  style={{
                    minWidth: 8,
                    height: 8,
                    borderRadius: 4,
                    background: "var(--accent)",
                    marginTop: 8,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{t}</div>
                  <div className="body-sm">{b}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Where we host</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {locations.map((l) => (
              <div
                key={l.id}
                style={{ padding: "12px 14px", borderRadius: 14, background: "var(--surface)" }}
              >
                <div style={{ fontSize: 22 }}>{l.country ? COUNTRY_FLAGS[l.country] ?? "" : ""}</div>
                <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{l.name.trim()}</div>
                <div className="body-sm">{[l.island, l.country].filter(Boolean).join(" · ")}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Flagship partner</div>
          <p className="body" style={{ margin: "0 0 14px" }}>
            Tanya Samui Holistic Health Retreat — 15+ years operating on Koh Samui, endorsed by
            members of the Thai Royal Family and honored with a United Nations award for its
            contribution to public health — is Dream Islands&apos; flagship partner property.
          </p>
          <Link href="/tanya-samui" className="btn btn-soft" style={{ display: "inline-flex" }}>
            Explore Tanya Samui {"→"}
          </Link>
        </div>

        <h2
          style={{
            margin: "48px 0 16px",
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 36,
            letterSpacing: "-.02em",
            color: "var(--ink)",
          }}
        >
          Talk to us <span className="display-italic">directly</span>.
        </h2>
        <p className="body" style={{ marginBottom: 20 }}>
          We&apos;ll WhatsApp you within a few minutes. No spam, no list resale.
        </p>
        <div style={{ display: "grid", gap: 10, maxWidth: 380 }}>
          <a
            className="btn btn-primary btn-lg btn-block"
            href="https://wa.me/message/HOF2AFIBDYY5J1"
            target="_blank"
            rel="noreferrer"
          >
            <Icon.wa width={18} height={18} /> Message on WhatsApp
          </a>
          <a className="btn btn-ghost btn-lg btn-block" href="mailto:hello@dreamislands.org">
            hello@dreamislands.org
          </a>
          <Link className="btn btn-soft btn-block" href="/start">
            Or take the 5-minute baseline <Icon.arrow width={16} height={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}
