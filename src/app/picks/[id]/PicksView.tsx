'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Competition } from '@/lib/storage'

const STATUS_LABELS: Record<string, string> = {
  open: 'Open for Picks',
  live: 'Live',
  complete: 'Complete',
}

const NAME_KEY = 'golf_pickem_name'

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

export default function PicksView({ competition }: { competition: Competition }) {
  const router = useRouter()
  const [participantName, setParticipantName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Restore saved name from previous visit
  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY)
    if (saved) setParticipantName(saved)
  }, [])

  const combinedOdds = Array.from(selected).reduce((sum, id) => {
    const g = competition.field.find((g) => g.id === id)
    return sum + (g?.odds ?? 0)
  }, 0)

  const myPick = participantName.trim()
    ? competition.picks.find(
        (p) => p.participantName.toLowerCase() === participantName.trim().toLowerCase()
      )
    : null

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
    const name = participantName.trim()
    if (!name) { setError('Enter your name'); return }
    if (selected.size !== 3) { setError('Select exactly 3 golfers'); return }
    if (combinedOdds < 120) {
      setError(`Combined odds must be at least 120 (yours: ${combinedOdds})`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/competitions/${competition.id}/picks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: name, golferIds: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to submit picks'); return }
      localStorage.setItem(NAME_KEY, name)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const isLiveOrComplete = competition.status === 'live' || competition.status === 'complete'
  const leaderboard = isLiveOrComplete ? computeLeaderboard(competition) : []
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
        {/* ── Winner announcement ───────────────────── */}
        {winner && (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
            🏆 <strong>Winner: {winner.pick.participantName}</strong> with a total of{' '}
            {winner.totalScore} strokes
          </div>
        )}

        {/* ── Pick submission (open only) ────────────── */}
        {competition.status === 'open' && (
          <>
            <h2 className="section-heading">Submit Your Picks</h2>

            {myPick ? (
              <>
                <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                  ✓ Picks submitted for <strong>{myPick.participantName}</strong>
                </div>
                <div className="my-picks-grid">
                  {myPick.golferIds.map((id) => {
                    const g = competition.field.find((gf) => gf.id === id)!
                    return (
                      <div key={id} className="my-pick-card">
                        <div className="my-pick-name">{g.name}</div>
                        <div className="my-pick-odds">{g.odds}/1</div>
                      </div>
                    )
                  })}
                </div>
                <p className="hint" style={{ marginTop: '0.75rem' }}>
                  Not you? Enter a different name below to submit separate picks.
                </p>
              </>
            ) : null}

            <form onSubmit={handleSubmit} style={{ marginTop: myPick ? '1.5rem' : 0 }}>
              <div className="form-group">
                <label htmlFor="participant-name">Your name</label>
                <input
                  id="participant-name"
                  type="text"
                  className="text-input"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="e.g. John Smith"
                  autoComplete="name"
                />
              </div>

              {!myPick && (
                <>
                  <p className="hint" style={{ marginBottom: '0.75rem' }}>
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
                    <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || selected.size !== 3 || combinedOdds < 120}
                    style={{ width: '100%', marginTop: '1.25rem' }}
                  >
                    {loading ? 'Submitting...' : 'Submit Picks'}
                  </button>
                </>
              )}

              {myPick && (
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={loading}
                  style={{ marginTop: '0.5rem' }}
                >
                  Check picks for this name
                </button>
              )}
            </form>
          </>
        )}

        {/* ── My picks summary (live / complete) ───────── */}
        {isLiveOrComplete && participantName.trim() && myPick && (
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
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label htmlFor="name-check">Not you?</label>
              <input
                id="name-check"
                type="text"
                className="text-input"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Enter a name to find picks"
              />
            </div>
          </>
        )}

        {/* ── Leaderboard (live / complete) ─────────────── */}
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
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                    const isMe =
                      participantName.trim() &&
                      entry.pick.participantName.toLowerCase() === participantName.trim().toLowerCase()
                    return (
                      <tr
                        key={entry.pick.id}
                        className={[
                          entry.eliminated ? 'row-eliminated' : '',
                          isMe ? 'row-me' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <td className="rank-cell">
                          {entry.eliminated ? '—' : isWinner ? '🏆' : i + 1}
                        </td>
                        <td>
                          {entry.pick.participantName}
                          {isMe && (
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
