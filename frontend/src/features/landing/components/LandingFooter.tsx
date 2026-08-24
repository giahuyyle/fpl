import { navigate } from '../../../shared/lib/navigation'
import { Brand } from '../../../shared/ui/Brand'

export function LandingFooter() {
  return <footer className="flex min-h-[230px] flex-col gap-7 bg-pl-purple px-5 py-11 text-white tablet:grid tablet:grid-cols-[1fr_1fr_auto] tablet:grid-rows-[auto_auto] tablet:items-start tablet:gap-x-9 tablet:gap-y-11 tablet:px-[max(42px,calc((100vw-1286px)/2))] tablet:py-[55px]">
    <Brand light />
    <p className="m-0 max-w-[350px] text-xs leading-relaxed text-[#cbb2cf]">Fantasy football for people who watch the whole match.</p>
    <div className="flex flex-wrap justify-start gap-7 tablet:justify-end [&_a]:text-[10px] [&_a]:font-bold [&_a]:text-[#eaddec] [&_a]:no-underline [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0 [&_button]:text-[10px] [&_button]:font-bold [&_button]:text-[#eaddec]"><a href="#game">How to play</a><a href="#features">Features</a><a href="#community">Community</a><button onClick={() => navigate('/login')}>Log in</button></div>
    <span className="w-full border-t border-white/15 pt-6 text-[9px] text-[#aa8bae] tablet:col-span-full">© 2026 Fantasy PL</span>
  </footer>
}
