import { useEffect, useState } from 'react'
import { navigate } from '../../shared/lib/navigation'
import { Brand } from '../../shared/ui/Brand'
import { AuthenticationRequiredError, getCurrentUser, logout } from './api/session'
import type { User } from './api/session'
import { primaryButtonClass } from './authStyles'

export function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof AuthenticationRequiredError) {
          navigate('/login')
          return
        }
        setMessage(error instanceof Error ? error.message : 'Unable to load your account.')
      })
    return () => { active = false }
  }, [])

  async function submitLogout() {
    setIsLoggingOut(true)
    setMessage('')
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to log out.')
      setIsLoggingOut(false)
    }
  }

  return <main className="min-h-screen bg-[#f7f4f7] px-5 py-8 text-pl-purple">
    <div className="mx-auto max-w-[720px]">
      <Brand />
      <section className="mt-12 rounded-2xl bg-white p-7 shadow-[0_18px_60px_#37003c18] tablet:p-10">
        <p className="text-[11px] font-bold tracking-[.18em] text-pl-pink">YOUR ACCOUNT</p>
        {!user && !message && <p role="status">Loading your account…</p>}
        {user && <>
          <h1 className="mt-3 font-display text-4xl font-extrabold">Welcome, {user.username}</h1>
          <dl className="my-8 grid gap-4 text-sm">
            <div><dt className="font-bold">Username</dt><dd className="mt-1 text-muted">{user.username}</dd></div>
            <div><dt className="font-bold">Email</dt><dd className="mt-1 text-muted">{user.email}</dd></div>
          </dl>
          <button className={`${primaryButtonClass} max-w-[260px]`} type="button" disabled={isLoggingOut} onClick={submitLogout}>{isLoggingOut ? 'Logging out…' : 'Log out'}</button>
        </>}
        {message && <p className="mt-4 text-sm text-pl-pink" role="alert">{message}</p>}
      </section>
    </div>
  </main>
}
