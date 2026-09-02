import { AccountPage } from '../features/auth/AccountPage'
import { GuestOnlyRoute } from '../features/auth/components/GuestOnlyRoute'
import { LoginPage } from '../features/auth/LoginPage'
import { SignUpPage } from '../features/auth/SignUpPage'
import { LandingPage } from '../features/landing/LandingPage'
import { SquadPage } from '../features/squad/SquadPage'
import { usePathname } from '../shared/hooks/usePathname'

export function App() {
  const pathname = usePathname()
  if (pathname === '/login') return <GuestOnlyRoute><LoginPage /></GuestOnlyRoute>
  if (pathname === '/signup') return <GuestOnlyRoute><SignUpPage /></GuestOnlyRoute>
  if (pathname === '/account') return <AccountPage />
  if (pathname === '/squad') return <SquadPage key="squad-view" routeMode="view" />
  if (pathname === '/squad/pick') return <SquadPage key="squad-pick" routeMode="pick-team" />
  if (pathname === '/squad/transfers') return <SquadPage key="squad-transfers" routeMode="transfers" />
  return <GuestOnlyRoute><LandingPage /></GuestOnlyRoute>
}
