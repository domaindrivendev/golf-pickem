'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface GolferRow {
  name: string
  odds: string
}

interface Sport {
  key: string
  title: string
}

export default function NewCompetitionPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [golfers, setGolfers] = useState<GolferRow[]>([
    { name: '', odds: '' },
    { name: '', odds: '' },
    { name: '', odds: '' },
  ])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Odds loader state
  const [sports, setSports] = useState<Sport[]>([])
  const [sportsLoading, setSportsLoading] = useState(false)
  const [sportsError, setSportsError] = useState('')
  const [oddsLoading, setOddsLoading] = useState(false)
  const [oddsError, setOddsError] = useState('')
  const [showSports, setShowSports] = useState(false)
  const [bookmaker, setBookmaker] = useState('')
  const [selectedSportKey, setSelectedSportKey] = useState('')

  async function handleLoadSports() {
    setSportsError('')
    setSportsLoading(true)
    setShowSports(true)
    try {
      const res = await fetch('/api/odds')
      const data = await res.json()
      if (!res.ok) {
        setSportsError(data.error || 'Failed to load tournaments')
        return
      }
      if (data.length === 0) {
        setSportsError('No active golf tournaments found')
        return
      }
      setSports(data)
    } catch {
      setSportsError('Network error. Please try again.')
    } finally {
      setSportsLoading(false)
    }
  }

  async function handleLoadOdds(sportKey: string, sportTitle: string) {
    setOddsError('')
    setOddsLoading(true)
    try {
      const res = await fetch(`/api/odds?sport=${encodeURIComponent(sportKey)}`)
      const data = await res.json()
      if (!res.ok) {
        setOddsError(data.error || 'Failed to load odds')
        return
      }
      setGolfers(data.golfers.map((g: { name: string; odds: number }) => ({
        name: g.name,
        odds: String(g.odds),
      })))
      setBookmaker(data.bookmaker)
      setSelectedSportKey(sportKey)
      setShowSports(false)
    } catch {
      setOddsError('Network error. Please try again.')
    } finally {
      setOddsLoading(false)
    }
  }

  function addGolfer() {
    setGolfers([...golfers, { name: '', odds: '' }])
  }

  function removeGolfer(i: number) {
    setGolfers(golfers.filter((_, idx) => idx !== i))
  }

  function updateGolfer(i: number, field: 'name' | 'odds', value: string) {
    const updated = [...golfers]
    updated[i] = { ...updated[i], [field]: value }
    setGolfers(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const validGolfers = golfers.filter((g) => g.name.trim() && g.odds.trim())
    if (validGolfers.length === 0) {
      setError('Add at least one golfer with a name and odds')
      return
    }
    if (validGolfers.some((g) => isNaN(Number(g.odds)) || Number(g.odds) <= 0)) {
      setError('All odds must be positive numbers')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          field: validGolfers.map((g) => ({ name: g.name.trim(), odds: Number(g.odds) })),
          ...(selectedSportKey ? { sportKey: selectedSportKey } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create competition')
        return
      }
      router.push(`/admin/competitions/${data.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="site-header">
        <span className="logo">⛳ Golf Pickem</span>
        <div className="user-info">
          <Link href="/admin" className="btn btn-ghost">← Back</Link>
        </div>
      </header>

      <div className="page-wrapper page-wrapper-wide">
        <div className="card">
          <div className="card-header">
            <h1>New Competition</h1>
            <p>Set up the golfer field for your pickem competition</p>
          </div>

          <div className="card-body">
            {/* ── Odds loader ────────────────────────────── */}
            <div className="odds-loader-box">
              <div className="odds-loader-header">
                <div>
                  <strong>Load field from live odds</strong>
                  <p className="hint" style={{ marginTop: '0.2rem' }}>
                    Automatically import golfers and odds from a live tournament.
                    {bookmaker && <> Loaded from <strong>{bookmaker}</strong>.</>}
                  </p>
                </div>
                {!showSports && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleLoadSports}
                    disabled={sportsLoading}
                  >
                    {sportsLoading ? 'Loading...' : 'Browse Tournaments'}
                  </button>
                )}
              </div>

              {showSports && (
                <div style={{ marginTop: '0.75rem' }}>
                  {sportsError && (
                    <p className="hint" style={{ color: '#e05252' }}>{sportsError}</p>
                  )}
                  {oddsError && (
                    <p className="hint" style={{ color: '#e05252', marginTop: '0.4rem' }}>{oddsError}</p>
                  )}
                  {sportsLoading && (
                    <p className="hint">Fetching tournaments...</p>
                  )}
                  {!sportsLoading && sports.length > 0 && (
                    <>
                      <p className="hint" style={{ marginBottom: '0.5rem' }}>
                        Select a tournament to import its field and current betting odds:
                      </p>
                      <div className="sports-list">
                        {sports.map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            className="sport-option"
                            onClick={() => handleLoadOdds(s.key, s.title)}
                            disabled={oddsLoading}
                          >
                            <span>{s.title}</span>
                            {oddsLoading ? (
                              <span className="hint">Loading...</span>
                            ) : (
                              <span className="hint">Import →</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowSports(false)}
                    style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <hr className="divider" />

            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

              <div className="form-group">
                <label htmlFor="comp-name">Competition Name</label>
                <input
                  id="comp-name"
                  type="text"
                  className="text-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. The Masters 2025"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Golfer Field
                  <span className="hint" style={{ marginLeft: '0.5rem', textTransform: 'none', fontWeight: 400 }}>
                    ({golfers.filter((g) => g.name.trim()).length} golfers)
                  </span>
                </label>
                <p className="hint" style={{ marginBottom: '0.75rem' }}>
                  Odds are the X in X/1 — e.g. 14 for 14/1.
                  Participants must pick 3 golfers with combined odds of at least 120.
                </p>

                {golfers.map((g, i) => (
                  <div key={i} className="golfer-row">
                    <input
                      type="text"
                      className="golfer-input-name"
                      placeholder="Golfer name"
                      value={g.name}
                      onChange={(e) => updateGolfer(i, 'name', e.target.value)}
                    />
                    <input
                      type="number"
                      className="golfer-input-odds"
                      placeholder="Odds"
                      value={g.odds}
                      onChange={(e) => updateGolfer(i, 'odds', e.target.value)}
                      min="1"
                      step="1"
                    />
                    <span className="odds-suffix">/1</span>
                    {golfers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGolfer(i)}
                        className="btn-remove"
                        aria-label="Remove golfer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addGolfer}
                  className="btn btn-ghost btn-add-golfer"
                >
                  + Add Golfer
                </button>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Creating...' : 'Create Competition'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
