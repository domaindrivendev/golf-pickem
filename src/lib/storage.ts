import { prisma } from './prisma'

export interface User {
  id: string
  email: string
  passwordHash: string
  role: 'admin'
  createdAt: string
}

export interface Golfer {
  id: string
  name: string
  odds: number
  strokeScore?: number
}

export interface Pick {
  id: string
  participantName: string
  golferIds: string[]
  submittedAt: string
}

export interface Competition {
  id: string
  name: string
  status: 'draft' | 'open' | 'live' | 'complete'
  field: Golfer[]
  picks: Pick[]
  cutLine?: number
  createdAt: string
}

const competitionInclude = {
  golfers: true,
  picks: { include: { golfers: true } },
} as const

function mapCompetition(c: {
  id: string
  name: string
  status: string
  cutLine: number | null
  createdAt: Date
  golfers: { id: string; name: string; odds: number; strokeScore: number | null }[]
  picks: {
    id: string
    participantName: string
    submittedAt: Date
    golfers: { golferId: string }[]
  }[]
}): Competition {
  return {
    id: c.id,
    name: c.name,
    status: c.status as Competition['status'],
    cutLine: c.cutLine ?? undefined,
    createdAt: c.createdAt.toISOString(),
    field: c.golfers.map((g) => ({
      id: g.id,
      name: g.name,
      odds: g.odds,
      strokeScore: g.strokeScore ?? undefined,
    })),
    picks: c.picks.map((p) => ({
      id: p.id,
      participantName: p.participantName,
      submittedAt: p.submittedAt.toISOString(),
      golferIds: p.golfers.map((pg) => pg.golferId),
    })),
  }
}

export async function readUsers(): Promise<User[]> {
  const users = await prisma.user.findMany()
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    passwordHash: u.passwordHash,
    role: u.role as 'admin',
    createdAt: u.createdAt.toISOString(),
  }))
}

export async function readCompetitions(): Promise<Competition[]> {
  const competitions = await prisma.competition.findMany({
    include: competitionInclude,
    orderBy: { createdAt: 'desc' },
  })
  return competitions.map(mapCompetition)
}

export async function readCompetitionById(id: string): Promise<Competition | null> {
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: competitionInclude,
  })
  return competition ? mapCompetition(competition) : null
}
