import { getSession } from '@/lib/auth'
import { readCompetitions } from '@/lib/storage'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PicksView from './PicksView'

export default async function PicksCompetitionPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  const competitions = await readCompetitions()
  const competition = competitions.find((c) => c.id === params.id)
  if (!competition || competition.status === 'draft') notFound()

  return (
    <>
      <header className="site-header">
        <span className="logo">⛳ Golf Pickem</span>
        <div className="user-info">
          <Link href="/picks" className="btn btn-ghost">← Back</Link>
          {session?.role === 'admin' && (
            <Link href={`/admin/competitions/${params.id}`} className="btn btn-ghost">Manage</Link>
          )}
          {session?.role === 'admin' ? (
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="btn btn-ghost">Sign out</button>
            </form>
          ) : (
            <Link href="/auth/signin" className="btn btn-ghost">Admin sign in</Link>
          )}
        </div>
      </header>

      <div className="page-wrapper page-wrapper-wide">
        <PicksView competition={competition} />
      </div>
    </>
  )
}
