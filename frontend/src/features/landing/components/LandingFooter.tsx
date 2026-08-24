import { navigate } from '../../../shared/lib/navigation'
import { Brand } from '../../../shared/ui/Brand'

export function LandingFooter() {
  return <footer className="taste-footer"><Brand light /><p>Fantasy football for people who watch the whole match.</p><div><a href="#game">How to play</a><a href="#features">Features</a><a href="#community">Community</a><button onClick={() => navigate('/login')}>Log in</button></div><span>© 2026 Fantasy PL</span></footer>
}
