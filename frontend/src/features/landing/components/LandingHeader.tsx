import type { User } from '../../auth/api/session'
import { SiteHeader } from '../../../shared/ui/SiteHeader'
import { navigate } from '../../../shared/lib/navigation'
import { AccountMenu } from '../../auth/components/AccountMenu'

type LandingHeaderProps = {
  user: User | null | undefined
  isLoggingOut: boolean
  onLogout: () => void
}

export function LandingHeader({ user, isLoggingOut, onLogout }: LandingHeaderProps) {
  return <SiteHeader actions={<>
    {user === null && <button onClick={() => navigate('/login')}>Log in</button>}
    {user && <AccountMenu onLogout={onLogout} isLoggingOut={isLoggingOut} />}
  </>} />
}
