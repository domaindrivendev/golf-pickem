'use client'

import { useState, FormEvent } from 'react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Something went wrong')
      }

      setStatus('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <>
      <header className="site-header">
        <span className="logo">⛳ Golf Pickem</span>
      </header>

      <div className="page-wrapper">
        <div className="card">
          <div className="card-header">
            <h1>Sign In</h1>
            <p>Enter your email to receive a sign-in link</p>
          </div>

          <div className="card-body">
            {status === 'sent' ? (
              <>
                <div className="alert alert-success">
                  Check your email — we sent a sign-in link to <strong>{email}</strong>.
                </div>
                <p className="hint">
                  In local dev, check <code>tmp/emails.txt</code> in the project root.
                </p>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </div>

                {status === 'error' && (
                  <div className="alert alert-error">{error}</div>
                )}

                <button type="submit" className="btn btn-primary" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Sending…' : 'Send sign-in link'}
                </button>
              </form>
            )}

            <div className="hole-dots">
              {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
