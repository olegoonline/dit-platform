import { getSessionUser } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"
import PartnerOverviewView, {
  type ProgramOutcomeRow,
} from "./PartnerOverviewView"

export const dynamic = "force-dynamic"

export default async function PartnerOverview() {
  const user = await getSessionUser()
  const sb = await supabaseServer()

  const propertyIds = user?.partner_property_ids ?? []
  let propertyLabel: string | null = null
  if (propertyIds.length > 0) {
    const { data } = await sb
      .from("properties")
      .select("name, island, country")
      .in("id", propertyIds)
      .order("name", { ascending: true })
    if (data && data.length > 0) {
      propertyLabel =
        data.length === 1
          ? `${data[0].name} — ${data[0].island}, ${data[0].country}`
          : data.map((p) => p.name).join(" · ")
    }
  }

  const { data: rows } = await sb
    .from("partner_program_outcomes")
    .select(
      "program_id, program_name, cohort, tier, is_composite, completed_bookings, avg_wbs_delta, wbs_sample_count",
    )
    .order("program_name", { ascending: true })

  return (
    <PartnerOverviewView
      propertyLabel={propertyLabel}
      rows={(rows ?? []) as ProgramOutcomeRow[]}
    />
  )
}
