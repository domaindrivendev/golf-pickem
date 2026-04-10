const ESPN_LEADERBOARD = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'

type EspnCompetitor = {
  athlete: { displayName: string }
  score: string
}

type EspnEvent = {
  name: string
  competitions: Array<{ competitors: EspnCompetitor[] }>
}

function parseScore(raw: string): number | null {
  if (!raw || raw === '-') return null
  if (raw.toUpperCase() === 'E') return 0
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

export type EspnGolfer = {
  id: string
  name: string
  score: number | null   // null when not matched
  isMatched: boolean
  espnHint: string | null  // closest ESPN name by last name, only when !isMatched
}

export type EspnScoreResult = {
  tournament: string
  golfers: EspnGolfer[]
}

export async function fetchEspnScores(
  golfers: Array<{ id: string; name: string }>
): Promise<EspnScoreResult | null> {
  const res = await fetch(ESPN_LEADERBOARD, { cache: 'no-store' })
  if (!res.ok) return null

  const data = (await res.json()) as { events?: EspnEvent[] }
  const events = data.events ?? []
  if (events.length === 0) return null

  const event = events[0]
  const competitors = event.competitions?.[0]?.competitors ?? []

  // Case-insensitive exact match only — admin is responsible for matching names
  const scoreMap = new Map<string, number>()
  for (const c of competitors) {
    const score = parseScore(c.score)
    if (score !== null) {
      scoreMap.set(c.athlete.displayName.trim().toLowerCase(), score)
    }
  }

  const result: EspnGolfer[] = golfers.map((golfer) => {
    const score = scoreMap.get(golfer.name.trim().toLowerCase())
    if (score !== undefined) {
      return { id: golfer.id, name: golfer.name, score, isMatched: true, espnHint: null }
    }
    const lastName = golfer.name.trim().toLowerCase().split(' ').at(-1) ?? ''
    const espnHint =
      competitors.find((c) => c.athlete.displayName.trim().toLowerCase().split(' ').at(-1) === lastName)
        ?.athlete.displayName ?? null
    return { id: golfer.id, name: golfer.name, score: null, isMatched: false, espnHint }
  })

  return { tournament: event.name, golfers: result }
}
