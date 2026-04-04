import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/auth/signin')

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
            <h1>Admin Dashboard</h1>
            <p>Manage your golf pickem competition</p>
          </div>

          <div className="card-body">
            <div className="placeholder-section">
              <div className="placeholder-icon">🏆</div>
              <strong>Competition management coming soon</strong>
              <p style={{ marginTop: '0.5rem' }}>
                Set up tournaments, manage players, and track leaderboards here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
