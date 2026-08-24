import premierLeagueLogo from '../../assets/premier-league-logo.png'
import { navigate } from '../lib/navigation'

export function Brand({ light = false }: { light?: boolean }) {
  return <button className={`brand ${light ? 'brand-light' : ''}`} onClick={() => navigate('/')} aria-label="Fantasy PL home"><img className="brand-logo" src={premierLeagueLogo} alt="" /><span>FANTASY PL</span></button>
}
