import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { stripe } from "@/lib/stripe"
import { sendEmail, adminInbox } from "@/lib/email"
import { bookingInquiry } from "@/lib/email-templates"

type PublicBookingPayload = {
  // Legacy inquiry contract (used by MatchedView.tsx) — unchanged
  user_id?: string
  program_id?: string
  arrival?: string
  departure?: string
  pax?: number
  // Deposit-checkout contract (used by ReserveModal.tsx)
  variant_id?: string
  guest_name?: string
  guest_email?: string
  guest_whatsapp?: string
  ga_client_id?: string
  session_id?: string
  property_id?: string
  property_name?: string
  destination_country?: string
  market_country?: string
  traffic_channel?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status, headers: cors })
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: cors })
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(req: Request) {
  let body: PublicBookingPayload
  try {
    body = (await req.json()) as PublicBookingPayload
  } catch {
    return bad("invalid JSON body")
  }

  // New deposit-checkout flow (ReserveModal.tsx sends variant_id) — takes priority.
  if (body.variant_id) {
    return handleDepositCheckout(req, body)
  }

  // Legacy inquiry flow (MatchedView.tsx sends user_id + departure, no variant_id) — unchanged.
  const userId = (body.user_id ?? "").trim()
  const programId = (body.program_id ?? "").trim()
  const arrival = (body.arrival ?? "").trim()
  const departure = (body.departure ?? "").trim()
  const pax = Number(body.pax ?? 1)

  if (!userId) return bad("user_id required")
  if (!programId) return bad("program_id required")
  if (!ISO_DATE.test(arrival)) return bad("arrival must be YYYY-MM-DD")
  if (!ISO_DATE.test(departure)) return bad("departure must be YYYY-MM-DD")
  if (departure <= arrival) return bad("departure must be after arrival")
  if (!Number.isInteger(pax) || pax < 1 || pax > 20) return bad("pax must be 1–20")

  // Confirm user + program exist, get max_guests for upper bound
  const [{ data: user }, { data: program }] = await Promise.all([
    supabaseAdmin.from("users").select("id").eq("id", userId).maybeSingle(),
    supabaseAdmin
      .from("programs")
      .select("id, max_guests, active")
      .eq("id", programId)
      .maybeSingle(),
  ])
  if (!user) return bad("unknown user_id", 404)
  if (!program || !program.active) return bad("unknown or inactive program_id", 404)
  if (program.max_guests && pax > program.max_guests) {
    return bad(`pax exceeds program max_guests (${program.max_guests})`)
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      user_id: userId,
      program_id: programId,
      arrival,
      departure,
      pax,
      status: "inquiry",
    })
    .select("id, status, arrival, departure, pax")
    .single()

  if (error) return bad(error.message)

  // Fire notification to admin + (if any) partners of properties linked to this program.
  // No await — never block the response.
  void notifyInquiry({ req, userId, programId, bookingId: data.id, arrival, departure, pax })

  return NextResponse.json({ success: true, booking: data }, { headers: cors })
}

async function handleDepositCheckout(req: Request, body: PublicBookingPayload) {
  const programId = (body.program_id ?? "").trim()
  const variantId = (body.variant_id ?? "").trim()
  const arrival = (body.arrival ?? "").trim()
  const pax = Number(body.pax ?? 1)
  const guestName = (body.guest_name ?? "").trim()
  const guestEmail = (body.guest_email ?? "").trim() || null
  const guestWhatsapp = (body.guest_whatsapp ?? "").trim() || null

  if (!programId) return bad("program_id required")
  if (!variantId) return bad("variant_id required")
  if (!ISO_DATE.test(arrival)) return bad("arrival must be YYYY-MM-DD")
  if (!guestName) return bad("guest_name required")
  if (!guestEmail && !guestWhatsapp) return bad("guest_email or guest_whatsapp required")
  if (!Number.isInteger(pax) || pax < 1 || pax > 20) return bad("pax must be 1–20")

  const [{ data: variant }, { data: program }] = await Promise.all([
    supabaseAdmin
      .from("program_variants")
      .select("id, program_id, label, duration_nights, price_basic_thb, active")
      .eq("id", variantId)
      .maybeSingle(),
    supabaseAdmin
      .from("programs")
      .select("id, slug, name, active, max_guests")
      .eq("id", programId)
      .maybeSingle(),
  ])

  if (!program || !program.active) return bad("unknown or inactive program_id", 404)
  if (!variant || !variant.active || variant.price_basic_thb == null) {
    return bad("unknown or inactive variant_id", 404)
  }
  if (variant.program_id !== programId) return bad("variant_id does not belong to program_id")
  if (program.max_guests && pax > program.max_guests) {
    return bad(`pax exceeds program max_guests (${program.max_guests})`)
  }

  const arrivalDate = new Date(arrival + "T00:00:00Z")
  arrivalDate.setUTCDate(arrivalDate.getUTCDate() + variant.duration_nights)
  const departure = arrivalDate.toISOString().slice(0, 10)

  const fullPrice = Number(variant.price_basic_thb)
  const depositPct = 20
  const depositAmount = Math.round(fullPrice * (depositPct / 100))
  const remainingBalance = fullPrice - depositAmount

  const { data: guestUser, error: guestErr } = await supabaseAdmin
    .from("users")
    .insert({
      name: guestName,
      email: guestEmail,
      whatsapp: guestWhatsapp,
      country: body.destination_country ?? null,
      source: "website_reserve_modal",
    })
    .select("id")
    .single()
  if (guestErr || !guestUser) return bad(guestErr?.message ?? "could not create guest record")

  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from("bookings")
    .insert({
      user_id: guestUser.id,
      program_id: programId,
      variant_id: variantId,
      arrival,
      departure,
      pax,
      status: "inquiry",
      payment_status: "unpaid",
      currency: "THB",
      full_price: fullPrice,
      deposit_amount: depositAmount,
      deposit_pct: depositPct,
      remaining_balance: remainingBalance,
      price_version: "program_variants.price_basic_thb",
      price_valid_at: new Date().toISOString(),
      source: "website_reserve_modal",
    })
    .select("id")
    .single()
  if (bookingErr || !booking) return bad(bookingErr?.message ?? "could not create booking")

  const origin = new URL(req.url).origin
  const successUrl = `${origin}/programs/${program.slug}?booking=paid&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${origin}/programs/${program.slug}?booking=cancelled`

  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      client_reference_id: booking.id,
      customer_email: guestEmail ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: `${program.name} — ${variant.label} — reservation deposit`,
            },
            unit_amount: Math.round(depositAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        booking_id: booking.id,
        program_id: programId,
        variant_id: variantId,
        variant_label: variant.label,
        program_name: program.name,
        property_id: body.property_id ?? "",
        property_name: body.property_name ?? "",
        destination_country: body.destination_country ?? "",
        market_country: body.market_country ?? "",
        traffic_channel: body.traffic_channel ?? "",
        utm_source: body.utm_source ?? "",
        utm_medium: body.utm_medium ?? "",
        utm_campaign: body.utm_campaign ?? "",
        ga_client_id: body.ga_client_id ?? "",
        session_id: body.session_id ?? "",
        user_id: guestUser.id,
      },
    })
  } catch (err) {
    console.error("[bookings/public] stripe session create failed:", err)
    return bad("could not start checkout", 502)
  }

  const { error: updateErr } = await supabaseAdmin
    .from("bookings")
    .update({ stripe_session_id: session.id })
    .eq("id", booking.id)
  if (updateErr) console.error("[bookings/public] failed to store stripe_session_id:", updateErr)

  void notifyInquiry({
    req,
    userId: guestUser.id,
    programId,
    bookingId: booking.id,
    arrival,
    departure,
    pax,
  })

  return NextResponse.json(
    { success: true, booking: { id: booking.id }, checkout_url: session.url },
    { headers: cors },
  )
}

async function notifyInquiry(args: {
  req: Request
  userId: string
  programId: string
  bookingId: string
  arrival: string
  departure: string
  pax: number
}) {
  try {
    const origin = new URL(args.req.url).origin
    const [{ data: guest }, { data: program }] = await Promise.all([
      supabaseAdmin.from("users").select("name, whatsapp").eq("id", args.userId).maybeSingle(),
      supabaseAdmin
        .from("programs")
        .select("name, program_properties(properties(id, name))")
        .eq("id", args.programId)
        .maybeSingle(),
    ])
    if (!guest || !program) return

    type PP = { properties: { id: string; name: string } | null }
    const propertyLinks =
      ((program as unknown as { program_properties?: PP[] }).program_properties ?? []) as PP[]
    const firstProperty = propertyLinks.find((pp) => pp.properties)?.properties ?? null
    const propertyIds = propertyLinks
      .map((pp) => pp.properties?.id)
      .filter((x): x is string => !!x)

    let partnerEmails: string[] = []
    if (propertyIds.length > 0) {
      const { data: links } = await supabaseAdmin
        .from("partner_properties")
        .select("profile_id")
        .in("property_id", propertyIds)
      const linkedIds = Array.from(new Set((links ?? []).map((l) => l.profile_id as string)))
      const { data: partners } = linkedIds.length
        ? await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("role", "partner")
            .in("id", linkedIds)
        : { data: [] as Array<{ id: string }> }
      const ids = (partners ?? []).map((p) => p.id)
      if (ids.length > 0) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 })
        partnerEmails = users
          .filter((u) => ids.includes(u.id) && u.email)
          .map((u) => u.email as string)
      }
    }

    const recipients = Array.from(new Set([...adminInbox(), ...partnerEmails]))
    if (recipients.length === 0) return

    const mail = bookingInquiry({
      guestName: guest.name,
      whatsapp: guest.whatsapp,
      programName: program.name,
      propertyName: firstProperty?.name ?? null,
      arrival: args.arrival,
      departure: args.departure,
      pax: args.pax,
      adminBookingUrl: `${origin}/admin/bookings`,
    })
    await sendEmail({ to: recipients, ...mail, tag: "booking_inquiry" })
  } catch (err) {
    console.error("[notifyInquiry] failed:", err)
  }
}
