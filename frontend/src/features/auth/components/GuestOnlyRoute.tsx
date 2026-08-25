import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { navigate } from '../../../shared/lib/navigation'
import { getCurrentUser } from '../api/session'


export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const [canContinue, setCanContinue] = useState(false)

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then(() => {
        if (active) navigate('/account')
      })
      .catch(() => {
        if (active) setCanContinue(true)
      })
    return () => { active = false }
  }, [])

  if (!canContinue) {
    return <main className="grid min-h-screen place-items-center bg-white text-sm text-pl-purple" role="status">Checking your session…</main>
  }

  return children
}
