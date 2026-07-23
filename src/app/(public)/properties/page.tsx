import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

const COUNTRY_FLAGS: Record<string, string> = {
  Thailand: "🇹🇭",
  China: "🇨🇳",
  Indonesia: "🇮🇩",
  Singapore: "🇸🇬",
}

const TRACK_NAMES: Record<number, string> = {
  1: "Reset",
  2: "Performance",
  3: "Mind",
  4: "Immersion",
}

type PropertyRow = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  island: string | null
  country: string | null
  cohort_tags: number[] | null
  certified: boolean
  description: string | null
}

export default async function PropertiesPage() {
  const { data: rows } = await supabaseAdmin
    .from("properties")
    .select("id, name, slug, parent_id, island, country, cohort_tags, certified, description")
    .eq("active", true)
    .neq("name", "")
    .order("name")

  const properties = (rows ?? []) as PropertyRow[]
  const topLevel = properties.filter((p) => !p.parent_id)
  const childrenOf = (id: string) => properties.filter((p) => p.parent_id === id)

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <section className="shell" style={{ paddingTop: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Our ecosystem</div>
        <h1
          className="display"
          style={{ fontSize: "clamp(40px, 10vw, 72px)", margin: "0 0 24px", color: "var(--ink)" }}
        >
          Where the <span className="display-italic">work happens</span>.
        </h1>
        <p className="body-lg" style={{ marginBottom: 40, maxWidth: 760 }}>
          Every program on Dream Islands is delivered through a real property, clinic or center on
          the ground. This is the full list — where each one is, what it does, and what it's part of.
        </p>

        <div style={{ display: "grid", gap: 20 }}>
          {topLevel.map((prop) => (
            <div key={prop.id} className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 28, color: "var(--ink)" }}>
                  {prop.name.trim()}
                </h2>
                {prop.certified && (
                  <span className="tag" style={{ fontSize: 11 }}>Certified</span>
                )}
              </div>
              <div className="body-sm" style={{ marginBottom: 14 }}>
                {prop.country ? COUNTRY_FLAGS[prop.country] ?? "" : ""}{" "}
                {[prop.island, prop.country].filter(Boolean).join(" · ")}
              </div>
              {prop.description && (
                <p className="body" style={{ margin: "0 0 16px", maxWidth: 680 }}>
                  {prop.description}
                </p>
              )}
              {prop.cohort_tags && prop.cohort_tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: childrenOf(prop.id).length ? 20 : 0 }}>
                  {prop.cohort_tags.map((c) => (
                    <span key={c} className="tag-outline tag" style={{ fontSize: 11 }}>
                      {TRACK_NAMES[c] ?? `Track ${c}`}
                    </span>
                  ))}
                </div>
              )}

              {childrenOf(prop.id).length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    borderTop: "1px solid var(--line)",
                    paddingTop: 20,
                  }}
                >
                  {childrenOf(prop.id).map((child) => (
                    <div key={child.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15 }}>{child.name}</div>
                        {child.certified && <span className="tag" style={{ fontSize: 10 }}>Certified</span>}
                      </div>
                      {child.description && (
                        <p className="body-sm" style={{ margin: 0 }}>{child.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40 }}>
          <Link href="/programs" className="btn btn-primary">
            Browse programs at these properties
          </Link>
        </div>
      </section>
    </div>
  )
}

