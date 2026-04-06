import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readCompetitionById } from '@/lib/storage'

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

  const competition = await readCompetitionById(params.id)
  if (!competition) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (competition.status !== 'live') {
    return NextResponse.json({ error: 'Can only update scores during live competition' }, { status: 400 })
  }

  await Promise.all(
    competition.field
      .filter((g) => scores[g.id] !== undefined && scores[g.id] !== '')
      .map((g) => {
        const val = Number(scores[g.id])
        if (isNaN(val)) return Promise.resolve()
        return prisma.golfer.update({
          where: { id: g.id },
          data: { strokeScore: val },
        })
      })
  )

  const updated = await readCompetitionById(params.id)
  return NextResponse.json(updated)
}
