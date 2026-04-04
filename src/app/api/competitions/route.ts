import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readCompetitions, writeCompetitions } from '@/lib/storage'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, field } = body as {
    name: string
    field: Array<{ name: string; odds: number }>
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!Array.isArray(field) || field.length === 0) {
    return NextResponse.json({ error: 'Field must have at least one golfer' }, { status: 400 })
  }

  const competitions = await readCompetitions()
  const competition = {
    id: uuidv4(),
    name: name.trim(),
    status: 'draft' as const,
    field: field.map((g) => ({
      id: uuidv4(),
      name: g.name.trim(),
      odds: Number(g.odds),
    })),
    picks: [],
    createdAt: new Date().toISOString(),
  }
  competitions.push(competition)
  await writeCompetitions(competitions)

  return NextResponse.json(competition, { status: 201 })
}
