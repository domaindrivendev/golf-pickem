import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readCompetitions, writeCompetitions } from '@/lib/storage'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || (session.role !== 'participant' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { golferIds } = body as { golferIds: string[] }

  if (!Array.isArray(golferIds) || golferIds.length !== 3) {
    return NextResponse.json({ error: 'Must pick exactly 3 golfers' }, { status: 400 })
  }

  const competitions = await readCompetitions()
  const idx = competitions.findIndex((c) => c.id === params.id)
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const competition = { ...competitions[idx] }
  if (competition.status !== 'open') {
    return NextResponse.json({ error: 'Competition is not open for picks' }, { status: 400 })
  }

  if (competition.picks.some((p) => p.userId === session.sub)) {
    return NextResponse.json({ error: 'You have already submitted picks' }, { status: 400 })
  }

  const golfers = golferIds.map((id) => competition.field.find((g) => g.id === id))
  if (golfers.some((g) => !g)) {
    return NextResponse.json({ error: 'Invalid golfer selection' }, { status: 400 })
  }

  const combinedOdds = golfers.reduce((sum, g) => sum + g!.odds, 0)
  if (combinedOdds < 120) {
    return NextResponse.json(
      { error: `Combined odds must be at least 120 (yours: ${combinedOdds})` },
      { status: 400 }
    )
  }

  competition.picks = [
    ...competition.picks,
    {
      id: uuidv4(),
      userId: session.sub,
      userEmail: session.email,
      golferIds,
      submittedAt: new Date().toISOString(),
    },
  ]

  competitions[idx] = competition
  await writeCompetitions(competitions)

  return NextResponse.json({ ok: true }, { status: 201 })
}
