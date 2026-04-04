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

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/auth/signin')

  const competitions = await readCompetitions()

  return (
    <>
      <header className="site-header">
        <span className="logo">⛳ Golf Pickem</span>
        <div className="user-info">
          <span>{session.email}</span>
          <Link href="/picks" className="btn btn-ghost">My Picks</Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="btn btn-ghost">Sign out</button>
          </form>
        </div>
      </header>

      <div className="page-wrapper page-wrapper-wide">
        <div className="card">
          <div className="card-header card-header-row">
            <div>
              <h1>Admin Dashboard</h1>
              <p>Manage your golf pickem competitions</p>
            </div>
            <Link href="/admin/competitions/new" className="btn btn-primary btn-sm">
              + New Competition
            </Link>
          </div>

          <div className="card-body">
            {competitions.length === 0 ? (
              <div className="placeholder-section">
                <div className="placeholder-icon">🏆</div>
                <strong>No competitions yet</strong>
                <p style={{ marginTop: '0.5rem' }}>
                  Create your first competition to get started.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Field</th>
                    <th>Picks</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {competitions.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>
                        <span className={`status-badge status-${c.status}`}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td>{c.field.length} golfers</td>
                      <td>{c.picks.length} picks</td>
                      <td>
                        <Link
                          href={`/admin/competitions/${c.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
