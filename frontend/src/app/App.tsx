import { LoginPage } from '../features/auth/LoginPage'
import { SignUpPage } from '../features/auth/SignUpPage'
import { LandingPage } from '../features/landing/LandingPage'
import { usePathname } from '../shared/hooks/usePathname'

export function App() {
  const pathname = usePathname()
  if (pathname === '/login') return <LoginPage />
  if (pathname === '/signup') return <SignUpPage />
  return <LandingPage />
}
