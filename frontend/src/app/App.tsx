import { LoginPage } from '../features/auth/LoginPage'
import { LandingPage } from '../features/landing/LandingPage'
import { usePathname } from '../shared/hooks/usePathname'

export function App() {
  const pathname = usePathname()
  return pathname === '/login' ? <LoginPage /> : <LandingPage />
}
