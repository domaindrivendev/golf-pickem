import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readCompetitionById } from '@/lib/storage'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const { participantName, golferIds } = body as { participantName: string; golferIds: string[] }

  if (!participantName?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!Array.isArray(golferIds) || golferIds.length !== 3) {
    return NextResponse.json({ error: 'Must pick exactly 3 golfers' }, { status: 400 })
  }

  const competition = await readCompetitionById(params.id)
  if (!competition) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (competition.status !== 'open') {
    return NextResponse.json({ error: 'Competition is not open for picks' }, { status: 400 })
  }

  const name = participantName.trim()
  if (competition.picks.some((p) => p.participantName.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: `Picks already submitted for "${name}"` }, { status: 400 })
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

  const pick = await prisma.pick.create({
    data: {
      participantName: name,
      competitionId: params.id,
      golfers: { create: golferIds.map((golferId) => ({ golferId })) },
    },
  })

  return NextResponse.json({ ok: true, pickId: pick.id }, { status: 201 })
}
