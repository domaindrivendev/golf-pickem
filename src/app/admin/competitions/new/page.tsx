'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface GolferRow {
  name: string
  odds: string
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
                <label>Golfer Field</label>
                <p className="hint" style={{ marginBottom: '0.75rem' }}>
                  Enter each golfer and their odds (the X in X/1 — e.g. 14 for 14/1).
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
