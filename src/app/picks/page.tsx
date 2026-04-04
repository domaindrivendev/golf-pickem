import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PicksPage() {
  const session = await getSession()
  if (!session || session.role !== 'participant') redirect('/auth/signin')

  return (
    <>
      <header className="site-header">
        <span className="logo">⛳ Golf Pickem</span>
        <div className="user-info">
          <span>{session.email}</span>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="btn btn-ghost">Sign out</button>
          </form>
        </div>
      </header>

      <div className="page-wrapper">
        <div className="card">
          <div className="card-header">
            <h1>Submit Your Picks</h1>
            <p>Choose your players for the tournament</p>
          </div>

          <div className="card-body">
            <div className="placeholder-section">
              <div className="placeholder-icon">🏌️</div>
              <strong>Picks submission coming soon</strong>
              <p style={{ marginTop: '0.5rem' }}>
                Select your golfers and submit your picks for the week here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
