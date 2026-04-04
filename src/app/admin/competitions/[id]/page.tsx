import { getSession } from '@/lib/auth'
import { readCompetitions } from '@/lib/storage'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import CompetitionManager from './CompetitionManager'

export default async function AdminCompetitionPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/auth/signin')

  const competitions = await readCompetitions()
  const competition = competitions.find((c) => c.id === params.id)
  if (!competition) notFound()

  return (
    <>
      <header className="site-header">
        <span className="logo">⛳ Golf Pickem</span>
        <div className="user-info">
          <Link href="/admin" className="btn btn-ghost">← All Competitions</Link>
          <Link href="/picks" className="btn btn-ghost">My Picks</Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="btn btn-ghost">Sign out</button>
          </form>
        </div>
      </header>

      <div className="page-wrapper page-wrapper-wide">
        <CompetitionManager competition={competition} />
      </div>
    </>
  )
}
