import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ESPN_LEADERBOARD = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'

type EspnCompetitor = {
  athlete: { displayName: string }
  score: string
}

type EspnEvent = {
  name: string
  competitions: Array<{ competitors: EspnCompetitor[] }>
}

function parseScore(raw: string): number | null {
  if (!raw || raw === '-') return null
  if (raw.toUpperCase() === 'E') return 0
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

// Strip accents, hyphens, apostrophes, and periods so that e.g.
// "Nicolás Echavarría" matches "Nicolas Echavarria" and
// "Si-Woo Kim" matches "Si Woo Kim".
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')   // strip combining accent marks
    .replace(/[-'.]/g, ' ')    // hyphens/apostrophes/periods → space
    .replace(/\s+/g, ' ')      // collapse whitespace
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const competition = await prisma.competition.findUnique({
    where: { id: params.id },
    include: { golfers: true },
  })
  if (!competition) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (competition.status !== 'live') {
    return NextResponse.json({ error: 'Competition must be live to import scores' }, { status: 400 })
  }

  const res = await fetch(ESPN_LEADERBOARD, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ error: `ESPN API error: ${res.status}` }, { status: 502 })
  }

  const data = await res.json() as { events?: EspnEvent[] }
  const events = data.events ?? []
  if (events.length === 0) {
    return NextResponse.json({ error: 'No active tournament found on ESPN' }, { status: 404 })
  }

  // Use the first (current) event
  const event = events[0]
  const competitors = event.competitions?.[0]?.competitors ?? []

  // Build two lookups: exact (lowercase) and normalized (accents/punctuation stripped)
  const exactMap = new Map<string, number>()
  const normalMap = new Map<string, number>()
  for (const c of competitors) {
    const score = parseScore(c.score)
    if (score !== null) {
      exactMap.set(c.athlete.displayName.trim().toLowerCase(), score)
      normalMap.set(normalizeName(c.athlete.displayName), score)
    }
  }

  const matched: Array<{ id: string; name: string; score: number }> = []
  const unmatched: Array<{ competition: string; espn: string | null }> = []

  for (const golfer of competition.golfers) {
    const exactKey = golfer.name.trim().toLowerCase()
    const normalKey = normalizeName(golfer.name)
    const exact = exactMap.get(exactKey)
    const score = exact !== undefined ? exact : normalMap.get(normalKey)
    if (score !== undefined) {
      matched.push({ id: golfer.id, name: golfer.name, score })
    } else {
      // Find the closest ESPN name for diagnosis — first word (last name) match
      const lastName = normalKey.split(' ').at(-1) ?? ''
      const espnHint = competitors.find((c) =>
        normalizeName(c.athlete.displayName).split(' ').at(-1) === lastName
      )?.athlete.displayName ?? null
      unmatched.push({ competition: golfer.name, espn: espnHint })
    }
  }

  await Promise.all(
    matched.map((m) =>
      prisma.golfer.update({
        where: { id: m.id },
        data: { strokeScore: m.score },
      })
    )
  )

  return NextResponse.json({ tournament: event.name, matched, unmatched })
}
