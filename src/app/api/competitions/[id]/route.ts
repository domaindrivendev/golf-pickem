import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readCompetitions, writeCompetitions } from '@/lib/storage'

const STATUS_ORDER = ['draft', 'open', 'live', 'complete'] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const competitions = await readCompetitions()
  const idx = competitions.findIndex((c) => c.id === params.id)
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const competition = { ...competitions[idx] }

  if (body.action === 'advance') {
    const currentIdx = STATUS_ORDER.indexOf(competition.status as (typeof STATUS_ORDER)[number])
    if (currentIdx === STATUS_ORDER.length - 1) {
      return NextResponse.json({ error: 'Already complete' }, { status: 400 })
    }
    competition.status = STATUS_ORDER[currentIdx + 1]
  } else if (body.action === 'setCutLine') {
    if (competition.status !== 'live') {
      return NextResponse.json({ error: 'Can only set cut line during live competition' }, { status: 400 })
    }
    const cutLine = Number(body.cutLine)
    if (isNaN(cutLine)) {
      return NextResponse.json({ error: 'Invalid cut line' }, { status: 400 })
    }
    competition.cutLine = cutLine
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  competitions[idx] = competition
  await writeCompetitions(competitions)
  return NextResponse.json(competition)
}
