import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readCompetitions } from '@/lib/storage'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, field, sportKey } = body as {
    name: string
    field: Array<{ name: string; odds: number }>
    sportKey?: string
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!Array.isArray(field) || field.length === 0) {
    return NextResponse.json({ error: 'Field must have at least one golfer' }, { status: 400 })
  }

  const competition = await prisma.competition.create({
    data: {
      name: name.trim(),
      status: 'draft',
      sportKey: sportKey?.trim() || null,
      golfers: {
        create: field.map((g) => ({
          name: g.name.trim(),
          odds: Number(g.odds),
        })),
      },
    },
    include: { golfers: true, picks: { include: { golfers: true } } },
  })

  return NextResponse.json(
    {
      id: competition.id,
      name: competition.name,
      status: competition.status,
      cutLine: competition.cutLine ?? undefined,
      createdAt: competition.createdAt.toISOString(),
      field: competition.golfers.map((g) => ({
        id: g.id,
        name: g.name,
        odds: g.odds,
        strokeScore: g.strokeScore ?? undefined,
      })),
      picks: [],
    },
    { status: 201 }
  )
}

export async function GET() {
  const competitions = await readCompetitions()
  return NextResponse.json(competitions)
}
