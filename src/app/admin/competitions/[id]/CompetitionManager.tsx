'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Competition } from '@/lib/storage'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Open for Picks',
  live: 'Live',
  complete: 'Complete',
}

const NEXT_STATUS_LABELS: Record<string, string> = {
  draft: 'Open for Picks',
  open: 'Go Live',
  live: 'Mark Complete',
}

function computeLeaderboard(competition: Competition) {
  return competition.picks
    .map((pick) => {
      const golfers = pick.golferIds.map((id) => competition.field.find((g) => g.id === id)!)
      const totalScore = golfers.reduce((sum, g) => sum + (g.strokeScore ?? 0), 0)
      const eliminated =
        competition.cutLine !== undefined &&
        golfers.some((g) => g.strokeScore !== undefined && g.strokeScore > competition.cutLine!)
      return { pick, golfers, totalScore, eliminated }
    })
    .sort((a, b) => {
      if (a.eliminated && !b.eliminated) return 1
      if (!a.eliminated && b.eliminated) return -1
      return a.totalScore - b.totalScore
    })
}

export default function CompetitionManager({ competition }: { competition: Competition }) {
  const router = useRouter()
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      competition.field.map((g) => [g.id, g.strokeScore !== undefined ? String(g.strokeScore) : ''])
    )
  )
  const [cutLine, setCutLine] = useState(
    competition.cutLine !== undefined ? String(competition.cutLine) : ''
  )
  const [advanceLoading, setAdvanceLoading] = useState(false)
  const [scoresLoading, setScoresLoading] = useState(false)
  const [cutLoading, setCutLoading] = useState(false)
  const [advanceError, setAdvanceError] = useState('')
  const [scoresMsg, setScoresMsg] = useState('')
  const [cutMsg, setCutMsg] = useState('')

  async function handleAdvance() {
    setAdvanceError('')
    setAdvanceLoading(true)
    try {
      const res = await fetch(`/api/competitions/${competition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAdvanceError(data.error || 'Failed to advance status')
        return
      }
      router.refresh()
    } finally {
      setAdvanceLoading(false)
    }
  }

  async function handleSaveScores(e: React.FormEvent) {
    e.preventDefault()
    setScoresMsg('')
    setScoresLoading(true)
    try {
      const res = await fetch(`/api/competitions/${competition.id}/golfers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores }),
      })
      if (!res.ok) {
        const data = await res.json()
        setScoresMsg(data.error || 'Failed to save scores')
        return
      }
      setScoresMsg('Scores saved.')
      router.refresh()
    } finally {
      setScoresLoading(false)
    }
  }

  async function handleSetCutLine(e: React.FormEvent) {
    e.preventDefault()
    setCutMsg('')
    setCutLoading(true)
    try {
      const res = await fetch(`/api/competitions/${competition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setCutLine', cutLine: Number(cutLine) }),
      })
      if (!res.ok) {
        const data = await res.json()
        setCutMsg(data.error || 'Failed to set cut line')
        return
      }
      setCutMsg('Cut line saved.')
      router.refresh()
    } finally {
      setCutLoading(false)
    }
  }

  const leaderboard = computeLeaderboard(competition)
  const isLiveOrComplete = competition.status === 'live' || competition.status === 'complete'

  return (
    <div className="card">
      <div className="card-header card-header-row">
        <div>
          <h1>{competition.name}</h1>
          <p>
            <span className={`status-badge status-${competition.status}`}>
              {STATUS_LABELS[competition.status]}
            </span>
          </p>
        </div>
        {competition.status !== 'complete' && (
          <div>
            {advanceError && (
              <p className="hint" style={{ color: '#e05252', marginBottom: '0.4rem' }}>
                {advanceError}
              </p>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAdvance}
              disabled={advanceLoading}
            >
              {advanceLoading ? 'Saving...' : `→ ${NEXT_STATUS_LABELS[competition.status]}`}
            </button>
          </div>
        )}
      </div>

      <div className="card-body">
        {/* ── Golfer Field ───────────────────────────── */}
        <h2 className="section-heading">Golfer Field</h2>

        {competition.status === 'live' ? (
          <form onSubmit={handleSaveScores}>
            <table className="data-table" style={{ marginBottom: '0.75rem' }}>
              <thead>
                <tr>
                  <th>Golfer</th>
                  <th>Odds</th>
                  <th>Stroke Score</th>
                  <th>Cut Status</th>
                </tr>
              </thead>
              <tbody>
                {competition.field.map((g) => {
                  const isCut =
                    competition.cutLine !== undefined &&
                    g.strokeScore !== undefined &&
                    g.strokeScore > competition.cutLine
                  return (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td>{g.odds}/1</td>
                      <td>
                        <input
                          type="number"
                          className="score-input"
                          value={scores[g.id] ?? ''}
                          onChange={(e) =>
                            setScores({ ...scores, [g.id]: e.target.value })
                          }
                          placeholder="—"
                        />
                      </td>
                      <td>
                        {competition.cutLine === undefined ? (
                          <span style={{ color: 'var(--gray-600)', fontSize: '0.82rem' }}>No cut set</span>
                        ) : isCut ? (
                          <span style={{ color: '#e05252', fontWeight: 600, fontSize: '0.82rem' }}>✕ Cut</span>
                        ) : (
                          <span style={{ color: 'var(--green-mid)', fontWeight: 600, fontSize: '0.82rem' }}>✓ In</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {scoresMsg && (
              <p
                className="hint"
                style={{ color: scoresMsg.startsWith('Scores') ? 'var(--green-mid)' : '#e05252', marginBottom: '0.5rem' }}
              >
                {scoresMsg}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-sm" disabled={scoresLoading}>
              {scoresLoading ? 'Saving...' : 'Save Scores'}
            </button>
          </form>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Golfer</th>
                <th>Odds</th>
                {isLiveOrComplete && <th>Score</th>}
              </tr>
            </thead>
            <tbody>
              {competition.field.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td>{g.odds}/1</td>
                  {isLiveOrComplete && <td>{g.strokeScore ?? '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Cut Line (live only) ───────────────────── */}
        {competition.status === 'live' && (
          <>
            <hr className="divider" />
            <h2 className="section-heading">Cut Line</h2>
            <p className="hint" style={{ marginBottom: '0.75rem' }}>
              Golfers with a stroke score above this number are cut.
              Participants with any cut golfer are eliminated.
              {competition.cutLine !== undefined && (
                <> Currently set to <strong>{competition.cutLine}</strong>.</>
              )}
            </p>
            <form onSubmit={handleSetCutLine} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                className="score-input"
                value={cutLine}
                onChange={(e) => setCutLine(e.target.value)}
                placeholder="e.g. 145"
                required
                style={{ width: '90px' }}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={cutLoading}>
                {cutLoading ? 'Saving...' : 'Set Cut Line'}
              </button>
              {cutMsg && (
                <span className="hint" style={{ color: cutMsg.startsWith('Cut') ? 'var(--green-mid)' : '#e05252' }}>
                  {cutMsg}
                </span>
              )}
            </form>
          </>
        )}

        {/* ── Picks / Leaderboard ────────────────────── */}
        <hr className="divider" />
        <h2 className="section-heading">
          {isLiveOrComplete ? 'Leaderboard' : `Picks (${competition.picks.length})`}
        </h2>

        {competition.picks.length === 0 ? (
          <p className="hint">No picks submitted yet.</p>
        ) : isLiveOrComplete ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Participant</th>
                <th>Pick 1</th>
                <th>Pick 2</th>
                <th>Pick 3</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => {
                const isWinner = competition.status === 'complete' && i === 0 && !entry.eliminated
                return (
                  <tr key={entry.pick.id} className={entry.eliminated ? 'row-eliminated' : ''}>
                    <td className="rank-cell">
                      {entry.eliminated ? '—' : isWinner ? '🏆' : i + 1}
                    </td>
                    <td>{entry.pick.participantName}</td>
                    {entry.golfers.map((g, gi) => (
                      <td key={gi}>
                        {g.name}
                        {g.strokeScore !== undefined ? ` (${g.strokeScore})` : ''}
                      </td>
                    ))}
                    <td>{entry.golfers.every((g) => g.strokeScore !== undefined) ? entry.totalScore : '—'}</td>
                    <td>
                      {entry.eliminated ? (
                        <span style={{ color: '#e05252', fontSize: '0.82rem', fontWeight: 600 }}>Eliminated</span>
                      ) : isWinner ? (
                        <span style={{ color: 'var(--green-mid)', fontSize: '0.82rem', fontWeight: 600 }}>Winner</span>
                      ) : (
                        <span style={{ color: 'var(--green-mid)', fontSize: '0.82rem' }}>In</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Pick 1</th>
                <th>Pick 2</th>
                <th>Pick 3</th>
                <th>Combined Odds</th>
              </tr>
            </thead>
            <tbody>
              {competition.picks.map((pick) => {
                const golfers = pick.golferIds.map((id) => competition.field.find((g) => g.id === id)!)
                const combined = golfers.reduce((s, g) => s + g.odds, 0)
                return (
                  <tr key={pick.id}>
                    <td>{pick.participantName}</td>
                    {golfers.map((g, i) => (
                      <td key={i}>{g.name} ({g.odds}/1)</td>
                    ))}
                    <td>{combined}/1</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
