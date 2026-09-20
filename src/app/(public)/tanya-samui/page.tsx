import Image from "next/image"
import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase-server"
import { mapProgram, type DbProgramRow } from "../_lib/programMapping"
import ProgramCard from "../_components/ProgramCard"
import { ReviewCard, type Review } from "../_components/ReviewsSection"
import { Icon } from "../_components/Icon"

export const dynamic = "force-dynamic"

const HERO_IMG = "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/tanya-property-hero.webp"

const STATS = [
  { n: "20+", l: "Hectares of tropical parkland" },
  { n: "500+", l: "Rooms and villas" },
  { n: "2009", l: "Operating since" },
  { n: "10,000+", l: "Guests from 40+ countries" },
]

const SPACES = [
  {
    slug: "tanya-core",
    name: "Tanya Samui Holistic Health Retreat",
    tag: "The core protocol",
    body: "The main facility: accommodation, structured daily schedule, the signature Tanya Oil detox protocol, herbal cleanse solutions, and personal reviews by Teacher Khun Kob. This is where a stay begins and ends.",
  },
  {
    slug: "tanya-wellbeing",
    name: "Tanya Wellness Center",
    tag: "À la carte spa",
    body: "Movement, mindfulness and spiritual practice: yoga, breathwork, meditation, sound healing, Reiki, and the full massage and beauty menu — bookable as standalone treatments or layered onto any program.",
  },
  {
    slug: "bunya-clinic",
    name: "Bunya Clinic",
    tag: "Preventive medicine",
    body: "Modern diagnostics inside the retreat: doctor consultations, full blood panels, ultrasound, chiropractic and osteopathy. Medically supervised where the protocol calls for it — not a substitute for your own doctor.",
  },
]

const INDICATIONS = [
  "Want a genuine reset and recovery, not just a vacation",
  "Are rebuilding overall health after a stretch of neglect or stress",
  "Want to support a healthy weight with real structure",
  "Want visibly refreshed skin and a sense of renewed vitality",
  "Want to deepen a meditation or yoga practice with daily guidance",
  "Are choosing between programs and want the Wellness Baseline to decide for them, not guesswork",
]

const FAQ_LINK_LABEL = "See all 23 answers"

const GALLERY = [
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/lotus-lake.jpg", caption: "Lotus Lake at dusk" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/meditation-hall.jpg", caption: "Meditation hall" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/swimming-pool.jpg", caption: "The pool" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/entrance.jpg", caption: "Entrance" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/territory.jpg", caption: "Grounds" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/spa-zone.jpg", caption: "Morning spa" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/tanya-oil.jpg", caption: "The Tanya Oil protocol" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/gardens.jpg", caption: "Gardens" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/khun-kob-monks.jpg", caption: "Teacher Khun Kob" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/reception.jpg", caption: "Reception" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/herbal-drink.jpg", caption: "Herbal cleanse" },
  { url: "https://xbzrtofanbrahasxbisf.supabase.co/storage/v1/object/public/properties/tanya-samui/gallery/relax-zone.jpg", caption: "Relax zone" },
]

export default async function TanyaSamuiHub() {
  const { data: propRows } = await supabaseAdmin
    .from("properties")
    .select("id, slug, name, description, image_url")
    .in("slug", ["tanya-core", "bunya-clinic", "tanya-wellbeing"])

  const descBySlug: Record<string, string> = {}
  const imageBySlug: Record<string, string | null> = {}
  for (const p of propRows ?? []) {
    descBySlug[p.slug] = p.description ?? ""
    imageBySlug[p.slug] = p.image_url
  }

  const { data: progRows } = await supabaseAdmin
    .from("programs")
    .select(
      "id, name, slug, summary, cohort, tier, duration_days, price_usd, outcomes, is_composite, hero_image_url, " +
        "program_properties(role, properties(id, name, slug, island, country, contact_wa)), " +
        "program_variants(duration_days, duration_nights, price_basic_usd, price_vip_usd, active)",
    )
    .eq("active", true)
    .eq("status", "published")
    .not("slug", "like", "wudang-%")
    .not("slug", "like", "mile-%")
    .order("sort_order")

  const programs = ((progRows ?? []).filter((row: any) => (row.program_properties ?? []).some((pp: any) => ["tanya-core","bunya-clinic","tanya-wellbeing"].includes(pp.properties?.slug))) as unknown as DbProgramRow[]).map(mapProgram)

  const { data: reviewRows } = await supabaseAdmin
    .from("reviews")
    .select("*")
    .eq("status", "published")
    .in("visibility", ["both", "en"])
    .order("featured", { ascending: false })
    .limit(6)
  const reviews = ((reviewRows ?? []) as Review[]).filter((r) => r.text_en?.trim()).slice(0, 3)

  const { data: faqRows } = await supabaseAdmin
    .from("faq")
    .select("id, question_en, answer_en, link")
    .eq("status", "published")
    .in("visibility", ["both", "en"])
    .order("sort_order")
    .limit(4)

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <section style={{ position: "relative", minHeight: "72vh", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Image src={HERO_IMG} alt="Tanya Samui" fill priority sizes="100vw" style={{ objectFit: "cover" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, #1C262A 5%, rgba(28,38,42,.75) 45%, rgba(28,38,42,.15) 100%)",
            }}
          />
        </div>
        <div className="shell" style={{ position: "relative", zIndex: 1, paddingTop: 60, paddingBottom: 56 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Koh Samui · Thailand · Since 2009</div>
          <h1
            className="display"
            style={{ fontSize: "clamp(38px, 8vw, 68px)", margin: "0 0 20px", color: "#fff", maxWidth: 800 }}
          >
            An oasis of health, harmony{" "}
            <span className="display-italic" style={{ color: "var(--accent)" }}>and longevity</span> on Koh Samui.
          </h1>
          <p className="body-lg" style={{ marginBottom: 28, maxWidth: 620, color: "rgba(255,255,255,.85)" }}>
            Tanya Samui is the largest wellness ecosystem on the island — a place for restorative rest and
            genuine, measured health recovery, running since 2009. Official Dream Islands flagship property.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href="/start" className="btn btn-primary btn-lg">
              Take the free Wellness Check-up <Icon.arrow width={18} height={18} />
            </Link>
            <Link href="#programs" className="btn btn-ghost btn-lg" style={{ background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }}>
              Browse programs
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="shell" style={{ paddingTop: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 20 }} className="card">
          {STATS.map((s) => (
            <div key={s.l} style={{ padding: 24 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 34, color: "var(--accent)", marginBottom: 4 }}>{s.n}</div>
              <div className="body-sm">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ECOSYSTEM */}
      <section className="shell" style={{ paddingTop: 64 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Ecosystem</div>
            <h2>Three spaces, <span className="display-italic">one protocol</span>.</h2>
          </div>
        </div>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {SPACES.map((s) => {
            const img = imageBySlug[s.slug]
            return (
              <div key={s.slug} className="card" style={{ overflow: "hidden" }}>
                {img && (
                  <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 10" }}>
                    <Image src={img} alt={s.name} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ padding: 24 }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>{s.tag}</div>
                  <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 22, color: "var(--ink)" }}>
                    {s.name}
                  </h3>
                  <p className="body-sm" style={{ margin: 0 }}>{descBySlug[s.slug] || s.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* GALLERY */}
      <section className="shell" style={{ paddingTop: 64 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Gallery</div>
            <h2>On the <span className="display-italic">ground</span>.</h2>
          </div>
        </div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {GALLERY.map((g) => (
            <div key={g.url} style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "4 / 3" }}>
              <Image src={g.url} alt={g.caption} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit: "cover" }} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,.6) 100%)",
                }}
              />
              <div style={{ position: "absolute", bottom: 10, left: 12, color: "#fff", fontSize: 13, fontWeight: 600 }}>
                {g.caption}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDER */}
      <section className="shell" style={{ paddingTop: 64 }}>
        <div className="card" style={{ padding: 32, display: "grid", gap: 24, gridTemplateColumns: "1fr", alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Founder</div>
            <h2 style={{ marginBottom: 14 }}>Teacher <span className="display-italic">Khun Kob</span>.</h2>
            <p className="body" style={{ maxWidth: 720 }}>
              Khun Kob founded Tanya Samui in 2009 and created the Tanya Oil detox methodology at its center —
              built over 15+ years of studying how nutrition, lifestyle and natural remedies affect long-term
              wellbeing. The retreat&apos;s work has been recognized by Thailand&apos;s Ministry of Public Health and
              Ministry of Tourism, endorsed by members of the Thai Royal Family, and honored with a United
              Nations award for contributions to public health. Every guest&apos;s protocol is personally reviewed
              by Khun Kob during their stay.
            </p>
          </div>
        </div>
      </section>

      {/* INDICATIONS */}
      <section className="shell" style={{ paddingTop: 64 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Who it&apos;s for</div>
            <h2>When to choose <span className="display-italic">Tanya Samui</span>.</h2>
          </div>
        </div>
        <div className="card" style={{ padding: 28 }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {INDICATIONS.map((t) => (
              <li key={t} style={{ display: "flex", gap: 12 }}>
                <span style={{ minWidth: 8, height: 8, borderRadius: 4, background: "var(--accent)", marginTop: 8 }} />
                <span className="body-sm">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PROGRAMS */}
      <section id="programs" className="shell" style={{ paddingTop: 64, scrollMarginTop: 90 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Signature programs</div>
            <h2>Pick your <span className="display-italic">protocol</span>.</h2>
          </div>
          <Link href="/tanya-samui/accommodation" className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: 13 }}>
            Accommodation
          </Link>
        </div>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {programs.map((p) => (
            <ProgramCard key={p.id} program={p} variant="wide" />
          ))}
        </div>
      </section>

      {/* CHECK-UP CTA */}
      <section className="shell" style={{ paddingTop: 64 }}>
        <div
          className="card"
          style={{ padding: "36px 28px", background: "var(--accent)", color: "var(--accent-ink)", border: 0, position: "relative", overflow: "hidden" }}
        >
          <div className="eyebrow" style={{ color: "rgba(20,32,27,.6)" }}>Not sure which one?</div>
          <p className="display" style={{ fontSize: "clamp(24px, 5vw, 36px)", margin: "12px 0 20px", maxWidth: 560 }}>
            <span className="display-italic">Free 5-minute check-up</span>, 23 questions, one matched program.
          </p>
          <Link href="/start" className="btn" style={{ background: "var(--accent-ink)", color: "var(--accent)" }}>
            Take the Wellness Baseline <Icon.arrow width={16} height={16} />
          </Link>
        </div>
      </section>

      {/* RESULTS */}
      <section className="shell" style={{ paddingTop: 64 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Results</div>
            <h2>We <span className="display-italic">measure</span>, not just promise.</h2>
          </div>
        </div>
        <p className="body" style={{ maxWidth: 720, marginBottom: 28 }}>
          <strong>Before</strong> your trip, a five-to-seven-minute check-in captures sleep, energy, stress,
          movement and recovery to set your personal Wellness Baseline. <strong>During</strong> your stay, brief
          daily check-ins let the team gently adjust protocol intensity to how your body is actually responding.{" "}
          <strong>After</strong> you return, your score is recalculated so the change is visible, not assumed —
          backed by blood work and ultrasound from Bunya Clinic where relevant.
        </p>
        {reviews.length > 0 && (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          <Link href="/reviews" className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: 13 }}>
            Read all guest stories
          </Link>
        </div>
      </section>

      {/* FAQ TEASER */}
      <section className="shell" style={{ paddingTop: 64 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Common questions</div>
            <h2>Before you <span className="display-italic">book</span>.</h2>
          </div>
          <Link href="/tanya-samui/faq" className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: 13 }}>
            {FAQ_LINK_LABEL}
          </Link>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {(faqRows ?? []).map((f) => (
            <div key={f.id} className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontSize: 15 }}>{f.question_en}</div>
              <p className="body-sm" style={{ margin: 0 }}>{f.answer_en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="shell" style={{ paddingTop: 64 }}>
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Ready to talk?</div>
          <h2 style={{ marginBottom: 20 }}>Message us <span className="display-italic">on WhatsApp</span>.</h2>
          <a
            href="https://wa.me/message/HOF2AFIBDYY5J1"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-lg"
          >
            <Icon.wa width={16} height={16} /> Chat with a coordinator
          </a>
        </div>
      </section>
    </div>
  )
}
