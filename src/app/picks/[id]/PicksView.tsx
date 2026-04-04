'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Competition, Pick } from '@/lib/storage'

const STATUS_LABELS: Record<string, string> = {
  open: 'Open for Picks',
  live: 'Live',
  complete: 'Complete',
}

function computeLeaderboard(competition: Competition, userId: string) {
  return competition.picks
    .map((pick) => {
      const golfers = pick.golferIds.map((id) => competition.field.find((g) => g.id === id)!)
      const totalScore = golfers.reduce((sum, g) => sum + (g.strokeScore ?? 0), 0)
      const eliminated =
        competition.cutLine !== undefined &&
        golfers.some((g) => g.strokeScore !== undefined && g.strokeScore > competition.cutLine!)
      const isMe = pick.userId === userId
      return { pick, golfers, totalScore, eliminated, isMe }
    })
    .sort((a, b) => {
      if (a.eliminated && !b.eliminated) return 1
      if (!a.eliminated && b.eliminated) return -1
      return a.totalScore - b.totalScore
    })
}

export default function PicksView({
  competition,
  myPick,
  userId,
}: {
  competition: Competition
  myPick: Pick | null
  userId: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const combinedOdds = Array.from(selected).reduce((sum, id) => {
    const g = competition.field.find((g) => g.id === id)
    return sum + (g?.odds ?? 0)
  }, 0)

  function toggleGolfer(id: string) {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else if (next.size < 3) {
      next.add(id)
    }
    setSelected(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (selected.size !== 3) {
      setError('Select exactly 3 golfers')
      return
    }
    if (combinedOdds < 120) {
      setError(`Combined odds must be at least 120 (yours: ${combinedOdds})`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/competitions/${competition.id}/picks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ golferIds: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit picks')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const isLiveOrComplete = competition.status === 'live' || competition.status === 'complete'
  const leaderboard = isLiveOrComplete ? computeLeaderboard(competition, userId) : []
  const myEntry = leaderboard.find((e) => e.isMe)
  const winner = competition.status === 'complete' ? leaderboard.find((e) => !e.eliminated) : null

  return (
    <div className="card">
      <div className="card-header">
        <h1>{competition.name}</h1>
        <p>
          <span className={`status-badge status-${competition.status}`}>
            {STATUS_LABELS[competition.status]}
          </span>
        </p>
      </div>

      <div className="card-body">
        {/* ── Winner announcement ─────────────────────── */}
        {competition.status === 'complete' && winner && (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
            🏆 <strong>Winner: {winner.pick.userEmail}</strong> with a total of{' '}
            {winner.totalScore} strokes
          </div>
        )}

        {/* ── My picks / submission ────────────────────── */}
        {myPick ? (
          <>
            <h2 className="section-heading">Your Picks</h2>
            <div className="my-picks-grid">
              {myPick.golferIds.map((id) => {
                const g = competition.field.find((gf) => gf.id === id)!
                const isCut =
                  competition.cutLine !== undefined &&
                  g.strokeScore !== undefined &&
                  g.strokeScore > competition.cutLine
                return (
                  <div key={id} className={`my-pick-card ${isCut ? 'pick-cut' : ''}`}>
                    <div className="my-pick-name">{g.name}</div>
                    <div className="my-pick-odds">{g.odds}/1</div>
                    {g.strokeScore !== undefined && (
                      <div className="my-pick-score">{g.strokeScore} strokes</div>
                    )}
                    {isCut && <div className="pick-cut-label">✕ Cut</div>}
                  </div>
                )
              })}
            </div>
            {myEntry && isLiveOrComplete && (
              <div className={`odds-counter ${myEntry.eliminated ? 'invalid' : 'valid'}`} style={{ marginTop: '1rem' }}>
                {myEntry.eliminated
                  ? '✕ You have been eliminated (one or more picks did not make the cut)'
                  : `Your total score: ${myEntry.golfers.every((g) => g.strokeScore !== undefined) ? myEntry.totalScore : '—'} strokes`}
              </div>
            )}
          </>
        ) : competition.status === 'open' ? (
          <>
            <h2 className="section-heading">Submit Your Picks</h2>
            <p className="hint" style={{ marginBottom: '1rem' }}>
              Choose 3 golfers. Their combined odds must be at least 120/1.
            </p>

            <div
              className={`odds-counter ${
                selected.size === 3 && combinedOdds >= 120
                  ? 'valid'
                  : selected.size === 3
                  ? 'invalid'
                  : ''
              }`}
              style={{ marginBottom: '1rem' }}
            >
              Selected: {selected.size}/3 golfers
              {selected.size > 0 && ` · Combined odds: ${combinedOdds}/1`}
              {selected.size === 3 && combinedOdds < 120 && ' (need at least 120/1)'}
            </div>

            <form onSubmit={handleSubmit}>
              {competition.field.map((g) => {
                const isSelected = selected.has(g.id)
                const isDisabled = !isSelected && selected.size === 3
                return (
                  <div
                    key={g.id}
                    className={`pick-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !isDisabled && toggleGolfer(g.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleGolfer(g.id)}
                      disabled={isDisabled}
                    />
                    <span className="pick-name">{g.name}</span>
                    <span className="pick-odds">{g.odds}/1</span>
                  </div>
                )
              })}

              {error && (
                <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || selected.size !== 3 || combinedOdds < 120}
                style={{ width: '100%', marginTop: '1.25rem' }}
              >
                {loading ? 'Submitting...' : 'Submit Picks'}
              </button>
            </form>
          </>
        ) : null}

        {/* ── Leaderboard (live / complete) ────────────── */}
        {isLiveOrComplete && (
          <>
            <hr className="divider" />
            <h2 className="section-heading">Leaderboard</h2>
            {competition.cutLine !== undefined && (
              <p className="hint" style={{ marginBottom: '0.75rem' }}>
                Cut line: {competition.cutLine} strokes. Golfers above this are cut.
              </p>
            )}
            {leaderboard.length === 0 ? (
              <p className="hint">No picks submitted.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Participant</th>
                    <th>Pick 1</th>
                    <th>Pick 2</th>
                    <th>Pick 3</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => {
                    const isWinner = competition.status === 'complete' && i === 0 && !entry.eliminated
                    return (
                      <tr
                        key={entry.pick.id}
                        className={[
                          entry.eliminated ? 'row-eliminated' : '',
                          entry.isMe ? 'row-me' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <td className="rank-cell">
                          {entry.eliminated ? '—' : isWinner ? '🏆' : i + 1}
                        </td>
                        <td>
                          {entry.pick.userEmail}
                          {entry.isMe && (
                            <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem', color: 'var(--green-mid)' }}>
                              (you)
                            </span>
                          )}
                        </td>
                        {entry.golfers.map((g, gi) => (
                          <td key={gi}>
                            {g.name}
                            {g.strokeScore !== undefined ? ` (${g.strokeScore})` : ''}
                            {competition.cutLine !== undefined &&
                              g.strokeScore !== undefined &&
                              g.strokeScore > competition.cutLine && (
                                <span style={{ color: '#e05252', marginLeft: '0.25rem', fontSize: '0.78rem' }}>✕</span>
                              )}
                          </td>
                        ))}
                        <td>
                          {entry.golfers.every((g) => g.strokeScore !== undefined)
                            ? entry.totalScore
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
