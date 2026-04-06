import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const BASE = 'https://api.the-odds-api.com/v4'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ODDS_API_KEY is not configured' }, { status: 500 })
  }

  const sport = req.nextUrl.searchParams.get('sport')

  if (!sport) {
    // Return the list of in-season golf tournaments
    const res = await fetch(`${BASE}/sports?apiKey=${apiKey}`, { next: { revalidate: 3600 } })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch sports list' }, { status: 502 })
    }
    const all = await res.json() as Array<{ key: string; group: string; title: string; active: boolean }>
    const golf = all.filter((s) => s.group.toLowerCase() === 'golf' && s.active)
    return NextResponse.json(golf)
  }

  // Fetch outright winner odds from all available regions/bookmakers
  const url =
    `${BASE}/sports/${encodeURIComponent(sport)}/odds` +
    `?apiKey=${apiKey}&regions=us,uk,eu,au&markets=outrights`

  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: `Odds API error: ${res.status} ${text}` }, { status: 502 })
  }

  const events = await res.json() as Array<{
    bookmakers: Array<{
      key: string
      title: string
      markets: Array<{
        key: string
        outcomes: Array<{ name: string; price: number }>
      }>
    }>
  }>

  // For each event, find the bookmaker with the most runners, then pick the
  // event/bookmaker combination that has the best overall coverage.
  let bestBookmaker: { title: string; outcomes: Array<{ name: string; price: number }> } | null = null

  for (const event of events) {
    let eventBest: { title: string; outcomes: Array<{ name: string; price: number }> } | null = null
    for (const bookmaker of event.bookmakers) {
      const market = bookmaker.markets.find((m) => m.key === 'outrights')
      if (!market) continue
      if (!eventBest || market.outcomes.length > eventBest.outcomes.length) {
        eventBest = { title: bookmaker.title, outcomes: market.outcomes }
      }
    }
    if (eventBest && (!bestBookmaker || eventBest.outcomes.length > bestBookmaker.outcomes.length)) {
      bestBookmaker = eventBest
    }
  }

  if (!bestBookmaker) {
    return NextResponse.json({ error: 'No outright odds found for this tournament' }, { status: 404 })
  }

  const golfers = bestBookmaker.outcomes
    // Decimal odds ≤ 2.0 (evens or shorter) are not meaningful for a tournament winner
    // and often indicate catch-all "Any Other Player" entries or bad data.
    .filter((outcome) => outcome.price > 2.0)
    .map((outcome) => ({
      name: outcome.name,
      // Convert decimal odds (e.g. 15.0) to fractional numerator (e.g. 14 → 14/1)
      odds: Math.round(outcome.price - 1),
    }))

  golfers.sort((a, b) => a.odds - b.odds)

  return NextResponse.json({ bookmaker: bestBookmaker.title, golfers })
}
