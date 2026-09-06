import './SiteHeader.css'
import type { ReactNode } from 'react'
import { Brand } from './Brand'
import { navigate } from '../lib/navigation'
import { usePathname } from '../hooks/usePathname'

export function SiteHeader({ actions }: { actions?: ReactNode }) {
  const pathname = usePathname()
  return <header className="site-header">
    <div className="site-header-inner">
      <Brand />
      <nav aria-label="Main navigation">
        {[['Matches', '/matches'], ['Table', '/table'], ['Fantasy', '/'], ['Players', '/players']].map(([label, href]) => {
          const active = href === '/' ? pathname === '/' || pathname.startsWith('/squad') : pathname === href
          return <a key={label} href={href} aria-current={active ? 'page' : undefined} onClick={(event) => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(href) } }}>{label}</a>
        })}
      </nav>
      <div className="site-header-actions">{actions ?? <button onClick={() => navigate('/account')} type="button">Account</button>}</div>
    </div>
  </header>
}
