import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { golferId, name } = body as { golferId: string; name: string }

  if (!golferId || !name?.trim()) {
    return NextResponse.json({ error: 'golferId and name are required' }, { status: 400 })
  }

  const golfer = await prisma.golfer.findUnique({ where: { id: golferId } })
  if (!golfer || golfer.competitionId !== params.id) {
    return NextResponse.json({ error: 'Golfer not found' }, { status: 404 })
  }

  await prisma.golfer.update({
    where: { id: golferId },
    data: { name: name.trim() },
  })

  return NextResponse.json({ ok: true })
}
