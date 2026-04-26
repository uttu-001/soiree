/**
 * app/layout.tsx — Root layout wrapping all pages.
 *
 * CONCEPT: Next.js App Router layouts
 * -------------------------------------
 * In Next.js 14's App Router, layout.tsx wraps every page inside its folder.
 * The root layout (this file) wraps the entire app.
 * It renders once and persists across page navigations — ideal for:
 *   - Global styles
 *   - Metadata (title, favicon, Open Graph)
 *   - Shared UI like nav bars (we'll add later)
 *
 * 'use client' is NOT here — layout.tsx is a Server Component by default.
 * Server Components render on the server, reducing JS sent to the browser.
 */

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Soirée — Life Events Concierge',
  description: 'Plan your perfect evening with Swiggy Food, Instamart, and Dineout',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
