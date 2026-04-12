import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchEspnScores } from '@/lib/espn'

// Dry-run name test — returns match results without writing to the DB.
// Used by the admin to identify and fix golfer name mismatches before going live.
export async function GET(
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

  const result = await fetchEspnScores(competition.golfers)
  if (!result) {
    return NextResponse.json({ error: 'No active tournament found on ESPN' }, { status: 502 })
  }

  return NextResponse.json(result)
}
