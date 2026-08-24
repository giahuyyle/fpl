import { useEffect, useState } from 'react'

export function usePathname() {
  const [pathname, setPathname] = useState(() => (typeof window === 'undefined' ? '/' : window.location.pathname))

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', updatePathname)
    return () => window.removeEventListener('popstate', updatePathname)
  }, [])

  return pathname
}
