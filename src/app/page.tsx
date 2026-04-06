import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { readCompetitions } from '@/lib/storage'

export default async function Home() {
  const session = await getSession()
  if (session?.role === 'admin') redirect('/admin')

  const competitions = await readCompetitions()
  const live = competitions
    .filter((c) => c.status === 'live')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (live.length > 0) redirect(`/picks/${live[0].id}`)
  redirect('/picks')
}
