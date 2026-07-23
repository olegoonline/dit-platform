import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase-server"
import { mapProgram, type DbProgramRow } from "../../_lib/programMapping"
import ProgramCard from "../../_components/ProgramCard"

export const dynamic = "force-dynamic"

const COUNTRY_FLAGS: Record<string, string> = {
  Thailand: "🇹🇭",
  China: "🇨🇳",
  Indonesia: "🇮🇩",
  Singapore: "🇸🇬",
  Philippines: "🇵🇭",
  Vietnam: "🇻🇳",
  Malaysia: "🇲🇾",
}

const TRACK_NAMES: Record<number, string> = {
  1: "Reset",
  2: "Performance",
  3: "Mind",
  4: "Immersion",
}

// Tanya ecosystem has its own full section — send visitors there instead of a generic page.
const TANYA_SLUGS = new Set(["tanya-core", "bunya-clinic", "tanya-wellbeing"])

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (TANYA_SLUGS.has(slug)) {
    redirect("/tanya-samui")
  }

  const { data: property } = await supabaseAdmin
    .from("properties")
    .select("id, name, slug, island, country, cohort_tags, certified, description, image_url, contact_wa, active")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle()

  if (!property) notFound()

  const { data: progRows } = await supabaseAdmin
    .from("programs")
    .select(
      "id, name, slug, summary, cohort, tier, duration_days, price_usd, outcomes, is_composite, hero_image_url, " +
        "program_properties!inner(role, properties(id, name, island, country, contact_wa)), " +
        "program_variants(duration_days, duration_nights, price_basic_usd, price_vip_usd, active)",
    )
    .eq("active", true)
    .eq("status", "published")
    .eq("program_properties.property_id", property.id)
    .order("sort_order")

  const programs = ((progRows ?? []) as unknown as DbProgramRow[]).map(mapProgram)

  const flag = property.country ? (COUNTRY_FLAGS[property.country] ?? "") : ""
  const waHref = property.contact_wa
    ? `https://wa.me/${property.contact_wa.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi! I'd like to know more about ${property.name.trim()}.`)}`
    : "https://wa.me/message/HOF2AFIBDYY5J1"

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <section className="shell" style={{ paddingTop: 24 }}>
        <Link href="/properties" className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13, marginBottom: 24, display: "inline-flex" }}>
          {"←"} All properties
        </Link>

        {property.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.image_url}
            alt={property.name.trim()}
            style={{ width: "100%", aspectRatio: "16 / 7", objectFit: "cover", borderRadius: 20, display: "block", marginBottom: 28 }}
          />
        )}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <h1 className="display" style={{ margin: 0, fontSize: "clamp(34px, 7vw, 56px)", color: "var(--ink)" }}>
            {property.name.trim()}
          </h1>
          {property.certified && <span className="tag">Certified</span>}
        </div>

        <div className="body-lg" style={{ marginBottom: 20, color: "var(--ink-2)" }}>
          {flag} {[property.island, property.country].filter(Boolean).join(" · ")}
        </div>

        {property.description && (
          <p className="body-lg" style={{ maxWidth: 760, marginBottom: 24 }}>
            {property.description}
          </p>
        )}

        {property.cohort_tags && property.cohort_tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
            {property.cohort_tags.map((c: number) => (
              <span key={c} className="tag-outline tag" style={{ fontSize: 11 }}>
                {TRACK_NAMES[c] ?? `Track ${c}`}
              </span>
            ))}
          </div>
        )}

        <a href={waHref} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginBottom: 48, display: "inline-flex" }}>
          Message on WhatsApp
        </a>

        <div className="section-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              {programs.length} program{programs.length === 1 ? "" : "s"}
            </div>
            <h2>Programs at <span className="display-italic">{property.name.trim()}</span>.</h2>
          </div>
        </div>

        {programs.length > 0 ? (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {programs.map((p) => (
              <ProgramCard key={p.id} program={p} variant="wide" />
            ))}
          </div>
        ) : (
          <p className="body">No published programs at this property yet.</p>
        )}
      </section>
    </div>
  )
}
