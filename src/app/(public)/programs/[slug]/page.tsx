import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase-server"
import { confirmCheckoutSession } from "@/lib/checkout-confirm"
import ProgramDetailView, { type ProgramDetail, type AccommodationItem } from "./ProgramDetailView"
import type { Metadata } from "next"
import { dataLayerScript } from "../../_lib/track"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { data } = await supabaseAdmin
    .from("programs")
    .select("name, summary, hero_image_url, program_properties(properties(island, country))")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("active", true)
    .maybeSingle()
  if (!data) {
    return { title: "Program not found" }
  }
  const row = data as unknown as {
    name: string
    summary: string | null
    hero_image_url: string | null
    program_properties: { properties: { island: string | null; country: string | null } | null }[]
  }
  const location = row.program_properties?.[0]?.properties
  const locationLabel = location ? [location.island, location.country].filter(Boolean).join(", ") : null
  const title = locationLabel ? `${row.name} - ${locationLabel}` : row.name
  const description = row.summary ?? `${row.name}, a wellness program offered through Dream Islands.`
  return {
    title,
    description,
    alternates: { canonical: `/programs/${slug}` },
    openGraph: {
      title: `${title} | Dream Islands`,
      description,
      url: `https://dreamislands.org/programs/${slug}`,
      images: row.hero_image_url ? [{ url: row.hero_image_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Dream Islands`,
      description,
      images: row.hero_image_url ? [row.hero_image_url] : undefined,
    },
  }
}

export const dynamic = "force-dynamic"

export default async function ProgramDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ booking?: string; session_id?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams

  const { data, error } = await supabaseAdmin
    .from("programs")
    .select(
      "id, name, slug, cohort, tier, summary, goal, target_guest, how_we_achieve, guest_feels, " +
        "included_services, contraindications, hero_image_url, outcomes, is_composite, " +
        "program_properties(role, properties(id, name, slug, island, country, contact_wa)), " +
        "program_variants(id, label, duration_days, duration_nights, price_basic_usd, price_vip_usd, active, sort_order), " +
        "program_schedule_items(id, day_no, start_time, end_time, title, description, kind, sort_order), " +
        "program_services(is_included, sort_order, services(id, name, slug, category, description, price_usd, duration_min))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .eq("active", true)
    .maybeSingle()

  if (error || !data) notFound()

  const program = data as unknown as ProgramDetail

  const confirmedBooking =
    sp.booking === "paid" && sp.session_id
      ? await confirmCheckoutSession(sp.session_id, program.id)
      : null

  // Pull accommodations for all linked properties
  const propertyIds = program.program_properties
    .map((pp) => pp.properties?.id)
    .filter((x): x is string => typeof x === "string")

  let accommodations: AccommodationItem[] = []
  if (propertyIds.length > 0) {
    const { data: accData } = await supabaseAdmin
      .from("accommodation_rates")
      .select("id, property_id, room_type, capacity, has_pool, price_thb_per_night, description, sort_order, properties(id, name)")
      .in("property_id", propertyIds)
      .eq("active", true)
      .order("property_id")
      .order("sort_order")
    accommodations = (accData ?? []) as unknown as AccommodationItem[]
  }

  const activeVariants = (program.program_variants ?? []).filter((v) => v.active)
  const lowestPrice = activeVariants.length > 0 ? Math.min(...activeVariants.map((v) => v.price_basic_usd)) : null
  const primaryProperty = program.program_properties?.[0]?.properties
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    additionalType: "https://schema.org/TouristTrip",
    name: program.name,
    description: program.summary ?? program.goal ?? undefined,
    image: program.hero_image_url ?? undefined,
    url: `https://dreamislands.org/programs/${program.slug}`,
    ...(lowestPrice != null
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: lowestPrice,
            availability: "https://schema.org/InStock",
            url: `https://dreamislands.org/programs/${program.slug}`,
          },
        }
      : {}),
    ...(primaryProperty
      ? {
          brand: {
            "@type": "Organization",
            name: primaryProperty.name,
          },
        }
      : {}),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script dangerouslySetInnerHTML={{ __html: dataLayerScript("view_program", { program_id: program.id, program_name: program.name, property_id: primaryProperty?.id, property_name: primaryProperty?.name, destination_country: primaryProperty?.country }) }} />
      <ProgramDetailView program={program} accommodations={accommodations} confirmedBooking={confirmedBooking} />
    </>
  )
}
