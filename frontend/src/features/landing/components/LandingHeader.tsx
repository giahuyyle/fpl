import type { User } from '../../auth/api/session'
import { Brand } from '../../../shared/ui/Brand'
import { Icon } from '../../../shared/ui/Icon'
import { PillButton } from '../../../shared/ui/PillButton'
import { navigate } from '../../../shared/lib/navigation'

type LandingHeaderProps = {
  user: User | null | undefined
  isLoggingOut: boolean
  onLogout: () => void
}

export function LandingHeader({ user, isLoggingOut, onLogout }: LandingHeaderProps) {
  return <header className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between border-b border-white/20 px-5 tablet:h-[86px] tablet:px-7 stage:px-[42px]">
    <Brand light />
    <nav className="hidden gap-9 wide:flex" aria-label="Main navigation">
      {['The game', 'Inside Fantasy PL', 'Community'].map((item, index) => <a className="relative text-xs font-semibold text-[#d9c5dc] no-underline after:absolute after:-bottom-2 after:left-0 after:right-full after:border-b-2 after:border-pl-green after:transition-all hover:after:right-0 focus-visible:after:right-0" href={['#game', '#features', '#community'][index]} key={item}>{item}</a>)}
    </nav>
    <div className="flex items-center gap-[19px]">
      {user === null && <>
        <button className="hidden border-0 bg-transparent text-xs font-bold text-white tablet:block" onClick={() => navigate('/login')}>Log in</button>
        <PillButton className="size-[42px] min-h-[42px] p-0 text-[0px] tablet:h-auto tablet:w-auto tablet:px-[23px] tablet:text-xs" variant="light" onClick={() => navigate('/login')}>Play now <Icon name="arrow" size={16} /></PillButton>
      </>}
      {user && <>
        <button className="hidden border-0 bg-transparent text-xs font-bold text-white tablet:block" onClick={onLogout} disabled={isLoggingOut}>{isLoggingOut ? 'Logging out…' : 'Log out'}</button>
        <PillButton className="size-[42px] min-h-[42px] p-0 text-[0px] tablet:h-auto tablet:w-auto tablet:px-[23px] tablet:text-xs" variant="light" onClick={() => navigate('/account')}>My account <Icon name="arrow" size={16} /></PillButton>
      </>}
    </div>
  </header>
}
