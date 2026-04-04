import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readCompetitions, writeCompetitions } from '@/lib/storage'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { scores } = body as { scores: Record<string, string> }

  const competitions = await readCompetitions()
  const idx = competitions.findIndex((c) => c.id === params.id)
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const competition = { ...competitions[idx] }
  if (competition.status !== 'live') {
    return NextResponse.json({ error: 'Can only update scores during live competition' }, { status: 400 })
  }

  competition.field = competition.field.map((g) => {
    const raw = scores[g.id]
    if (raw === undefined || raw === '') return g
    const val = Number(raw)
    if (isNaN(val)) return g
    return { ...g, strokeScore: val }
  })

  competitions[idx] = competition
  await writeCompetitions(competitions)
  return NextResponse.json(competition)
}
