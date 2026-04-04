import { getSession } from '@/lib/auth'
import { readCompetitions } from '@/lib/storage'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Open for Picks',
  live: 'Live',
  complete: 'Complete',
}

export default async function PicksPage() {
  const session = await getSession()
  if (!session || (session.role !== 'participant' && session.role !== 'admin')) redirect('/auth/signin')

  const competitions = await readCompetitions()
  const visible = competitions.filter((c) => c.status !== 'draft')

  return (
    <>
      <header className="site-header">
        <span className="logo">⛳ Golf Pickem</span>
        <div className="user-info">
          <span>{session.email}</span>
          {session.role === 'admin' && (
            <Link href="/admin" className="btn btn-ghost">Admin</Link>
          )}
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="btn btn-ghost">Sign out</button>
          </form>
        </div>
      </header>

      <div className="page-wrapper">
        <div className="card">
          <div className="card-header">
            <h1>Golf Pickem</h1>
            <p>Submit your picks and track the leaderboard</p>
          </div>

          <div className="card-body">
            {visible.length === 0 ? (
              <div className="placeholder-section">
                <div className="placeholder-icon">🏌️</div>
                <strong>No competitions available</strong>
                <p style={{ marginTop: '0.5rem' }}>Check back soon — competitions will appear here once they open.</p>
              </div>
            ) : (
              <div>
                {visible.map((c) => {
                  const myPick = c.picks.find((p) => p.userId === session.sub)
                  return (
                    <Link key={c.id} href={`/picks/${c.id}`} className="competition-card-link">
                      <div className="competition-card">
                        <div className="competition-card-main">
                          <strong>{c.name}</strong>
                          <span className={`status-badge status-${c.status}`}>
                            {STATUS_LABELS[c.status]}
                          </span>
                        </div>
                        <div className="competition-card-meta">
                          {c.field.length} golfers in field
                          {myPick ? ' · Picks submitted ✓' : c.status === 'open' ? ' · Picks needed' : ''}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
