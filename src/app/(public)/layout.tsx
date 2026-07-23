import { DM_Sans } from "next/font/google"
import TopNav from "./_components/TopNav"
import Footer from "./_components/Footer"
import WhatsAppFab from "./_components/WhatsAppFab"
import "./landing.css"

// Optima (display) and Aeroport (body) are the brand fonts. Neither is
// available via next/font/google, so they're declared directly as CSS
// font-family values in landing.css with system/self-hosted fallbacks.
// DM Sans is loaded here purely as the web-safe fallback for Aeroport,
// matching tanyasamui.ru's own approach.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dmsans",
  display: "swap",
})

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={dmSans.variable} style={{ fontFamily: "var(--font-body)" }}>
      <TopNav />
      {children}
      <Footer />
      <WhatsAppFab />
    </div>
  )
}
