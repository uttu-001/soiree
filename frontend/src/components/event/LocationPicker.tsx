/**
 * components/event/LocationPicker.tsx — Location input with GPS detect.
 *
 * CONCEPT: Browser Geolocation API
 * ----------------------------------
 * navigator.geolocation.getCurrentPosition() asks the browser for
 * the user's location. The browser prompts for permission.
 * On success we get lat/lng — we reverse geocode to a city name
 * using a free API (nominatim.openstreetmap.org).
 *
 * This is async and may fail (user denies, no GPS) — we handle
 * both cases gracefully with loading and error states.
 */

'use client'

import { useState } from 'react'

interface Props {
  value: string
  onChange: (location: string) => void
}

export function LocationPicker({ value, onChange }: Props) {
  const [detecting, setDetecting] = useState(false)
  const [gpsError, setGpsError] = useState('')

  async function detectLocation() {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported in this browser')
      return
    }

    setDetecting(true)
    setGpsError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Reverse geocode: lat/lng → city name
          // Nominatim is free and requires no API key
          const { latitude, longitude } = position.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await res.json()
          // Extract city/town/suburb from response
          const city = data.address?.city
            || data.address?.town
            || data.address?.suburb
            || data.address?.county
            || 'Your location'
          onChange(city)
        } catch {
          setGpsError('Could not detect city — please type it')
        } finally {
          setDetecting(false)
        }
      },
      () => {
        setGpsError('Location access denied — please type your city')
        setDetecting(false)
      }
    )
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="City or area, e.g. Lucknow"
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/3 border border-white/8
            text-sm text-ink-200 placeholder:text-ink-600
            focus:outline-none focus:border-coral-500/40 transition-colors"
        />
        <button
          type="button"
          onClick={detectLocation}
          disabled={detecting}
          title="Detect my location"
          className="px-3 py-2.5 rounded-xl border border-white/8 text-ink-400
            hover:border-white/20 transition-colors disabled:opacity-40 text-base"
        >
          {detecting ? '...' : '📍'}
        </button>
      </div>
      {gpsError && (
        <p className="text-xs text-amber-500/70 mt-1.5">{gpsError}</p>
      )}
    </div>
  )
}
