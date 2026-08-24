import { Brand } from '../../../shared/ui/Brand'
import { Icon } from '../../../shared/ui/Icon'
import { navigate } from '../../../shared/lib/navigation'

export function LandingHeader() {
  return <header className="taste-header"><Brand light /><nav aria-label="Main navigation"><a href="#game">The game</a><a href="#features">Inside Fantasy PL</a><a href="#community">Community</a></nav><div className="taste-header-actions"><button className="taste-login" onClick={() => navigate('/login')}>Log in</button><button className="pill-button pill-light" onClick={() => navigate('/login')}>Play now <Icon name="arrow" size={16} /></button></div></header>
}
