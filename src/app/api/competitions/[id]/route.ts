import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readCompetitionById } from '@/lib/storage'

const STATUS_ORDER = ['draft', 'open', 'live', 'complete'] as const

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const competition = await readCompetitionById(params.id)
  if (!competition) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.competition.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const competition = await readCompetitionById(params.id)
  if (!competition) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (body.action === 'advance') {
    const currentIdx = STATUS_ORDER.indexOf(competition.status as (typeof STATUS_ORDER)[number])
    if (currentIdx === STATUS_ORDER.length - 1) {
      return NextResponse.json({ error: 'Already complete' }, { status: 400 })
    }
    const nextStatus = STATUS_ORDER[currentIdx + 1]
    await prisma.competition.update({
      where: { id: params.id },
      data: { status: nextStatus },
    })
    return NextResponse.json({ ...competition, status: nextStatus })
  } else if (body.action === 'setCutLine') {
    if (competition.status !== 'live') {
      return NextResponse.json({ error: 'Can only set cut line during live competition' }, { status: 400 })
    }
    const cutLine = Number(body.cutLine)
    if (isNaN(cutLine)) {
      return NextResponse.json({ error: 'Invalid cut line' }, { status: 400 })
    }
    await prisma.competition.update({
      where: { id: params.id },
      data: { cutLine },
    })
    return NextResponse.json({ ...competition, cutLine })
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
