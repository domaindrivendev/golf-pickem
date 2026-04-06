import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const BASE = 'https://api.the-odds-api.com/v4'

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
  if (!competition.sportKey) {
    return NextResponse.json(
      { error: 'No tournament linked. Set a sport key first.' },
      { status: 400 }
    )
  }

  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ODDS_API_KEY is not configured' }, { status: 500 })
  }

  const url =
    `${BASE}/sports/${encodeURIComponent(competition.sportKey)}/scores` +
    `?apiKey=${apiKey}&daysFrom=3`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: `Odds API error: ${res.status} ${text}` }, { status: 502 })
  }

  const events = await res.json() as Array<{
    completed: boolean
    scores: Array<{ name: string; score: string }> | null
  }>

  // Find the event that has scores (prefer in-progress, fall back to any with scores)
  const eventWithScores = events.find((e) => !e.completed && e.scores) ?? events.find((e) => e.scores)
  if (!eventWithScores || !eventWithScores.scores) {
    return NextResponse.json({ error: 'No live scores available for this tournament' }, { status: 404 })
  }

  // Build a lookup map: normalized name -> score
  const scoreMap = new Map<string, number>()
  for (const s of eventWithScores.scores) {
    const parsed = parseInt(s.score, 10)
    if (!isNaN(parsed)) {
      scoreMap.set(s.name.trim().toLowerCase(), parsed)
    }
  }

  const matched: Array<{ id: string; name: string; score: number }> = []
  const unmatched: string[] = []

  for (const golfer of competition.golfers) {
    const key = golfer.name.trim().toLowerCase()
    const score = scoreMap.get(key)
    if (score !== undefined) {
      matched.push({ id: golfer.id, name: golfer.name, score })
    } else {
      unmatched.push(golfer.name)
    }
  }

  // Batch update matched golfers
  await Promise.all(
    matched.map((m) =>
      prisma.golfer.update({
        where: { id: m.id },
        data: { strokeScore: m.score },
      })
    )
  )

  return NextResponse.json({ matched, unmatched })
}
