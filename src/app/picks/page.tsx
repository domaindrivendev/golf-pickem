import { getSession } from '@/lib/auth'
import { readCompetitions } from '@/lib/storage'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  open: 'Open for Picks',
  live: 'Live',
  complete: 'Complete',
}

export default async function PicksPage() {
  const session = await getSession()
  const competitions = await readCompetitions()
  const visible = competitions.filter((c) => c.status !== 'draft')

  return (
    <>
      <header className="site-header">
        <span className="logo">⛳ Golf Pickem</span>
        <div className="user-info">
          {session?.role === 'admin' ? (
            <>
              <span>{session.email}</span>
              <Link href="/admin" className="btn btn-ghost">Admin</Link>
              <form action="/api/auth/signout" method="POST">
                <button type="submit" className="btn btn-ghost">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/auth/signin" className="btn btn-ghost">Admin sign in</Link>
          )}
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
                {visible.map((c) => (
                  <Link key={c.id} href={`/picks/${c.id}`} className="competition-card-link">
                    <div className="competition-card">
                      <div className="competition-card-main">
                        <strong>{c.name}</strong>
                        <span className={`status-badge status-${c.status}`}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </div>
                      <div className="competition-card-meta">
                        {c.field.length} golfers · {c.picks.length} picks submitted
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
