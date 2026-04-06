'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteCompetitionButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!confirm(`Delete "${name}"? This will permanently remove all picks and data for this competition.`)) return
    setLoading(true)
    await fetch(`/api/competitions/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn btn-ghost btn-sm"
      style={{ color: 'var(--red, #c0392b)' }}
    >
      {loading ? '…' : 'Delete'}
    </button>
  )
}
