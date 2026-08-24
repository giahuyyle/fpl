import premierLeagueLogo from '../../assets/premier-league-logo.png'
import { navigate } from '../lib/navigation'

export function Brand({ light = false }: { light?: boolean }) {
  return <button className={`flex items-center gap-2.5 border-0 bg-transparent p-0 font-display text-base font-extrabold leading-none tracking-[.08em] ${light ? 'text-white' : 'text-ink'}`} onClick={() => navigate('/')} aria-label="Fantasy PL home"><img className="block size-[34px] object-contain" src={premierLeagueLogo} alt="" /><span>FANTASY PL</span></button>
}
