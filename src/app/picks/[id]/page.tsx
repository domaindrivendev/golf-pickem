import { getSession } from '@/lib/auth'
import { readCompetitions } from '@/lib/storage'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import PicksView from './PicksView'

export default async function PicksCompetitionPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || (session.role !== 'participant' && session.role !== 'admin')) redirect('/auth/signin')

  const competitions = await readCompetitions()
  const competition = competitions.find((c) => c.id === params.id)
  if (!competition || competition.status === 'draft') notFound()

  const myPick = competition.picks.find((p) => p.userId === session.sub) ?? null

  return (
    <>
      <header className="site-header">
        <span className="logo">⛳ Golf Pickem</span>
        <div className="user-info">
          <Link href="/picks" className="btn btn-ghost">← Back</Link>
          {session.role === 'admin' && (
            <Link href={`/admin/competitions/${params.id}`} className="btn btn-ghost">Manage</Link>
          )}
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="btn btn-ghost">Sign out</button>
          </form>
        </div>
      </header>

      <div className="page-wrapper page-wrapper-wide">
        <PicksView competition={competition} myPick={myPick} userId={session.sub} />
      </div>
    </>
  )
}
