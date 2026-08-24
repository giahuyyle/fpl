import type { ReactNode } from 'react'
import { navigate } from '../../../shared/lib/navigation'
import { Brand } from '../../../shared/ui/Brand'

type AuthShellProps = {
  children: ReactNode
  kicker: string
  quote: string
  tagline: string
  tall?: boolean
}

export function AuthShell({ children, kicker, quote, tagline, tall = false }: AuthShellProps) {
  const desktopHeight = tall ? 'tablet:min-h-[max(100vh,860px)]' : 'tablet:min-h-screen'

  return <main className={`min-h-screen bg-white tablet:grid tablet:grid-cols-[minmax(420px,44%)_1fr] wide:grid-cols-[38%_62%] ${desktopHeight}`}>
    <aside className="relative hidden min-h-full overflow-hidden bg-pl-purple bg-[radial-gradient(circle_at_20%_15%,#68006f_0,transparent_31%),linear-gradient(135deg,transparent_40%,#00ff8510_40%_60%,transparent_60%)] px-[55px] py-[42px] text-white before:absolute before:-bottom-60 before:-left-44 before:size-[620px] before:rounded-full before:border before:border-white/10 after:absolute after:right-[-120px] after:top-[110px] after:h-[560px] after:w-80 after:rotate-[25deg] after:border after:border-pl-cyan/20 tablet:block wide:px-[30px] wide:py-[38px]">
      <Brand light />
      <div className="relative z-[2] mt-[min(24vh,190px)] max-w-[510px]">
        <span className="flex items-center gap-2 font-display text-[11px] font-bold leading-none tracking-[.18em] text-pl-green">{kicker}</span>
        <blockquote className="my-7 font-display text-[clamp(35px,3.2vw,50px)] font-bold leading-[1.15] tracking-[-.045em] wide:text-[32px]">“{quote}”</blockquote>
        <p className="text-[#d4bed7]">{tagline}</p>
      </div>
      <div className="absolute bottom-[70px] right-10 opacity-50" aria-hidden="true">
        <span className="absolute bottom-[50px] right-[120px] size-[11px] rounded-full border-2 border-pl-green" />
        <span className="absolute bottom-[140px] right-[35px] size-[11px] rounded-full border-2 border-pl-green" />
        <span className="absolute bottom-[200px] right-[170px] size-[11px] rounded-full border-2 border-pl-green" />
      </div>
      <div className="absolute bottom-[37px] left-[55px] right-[55px] z-[2] flex justify-between text-[10px] text-[#a589a8] wide:left-[30px] wide:right-[30px]"><span>© 2026 Fantasy PL</span><span>Made for the game.</span></div>
    </aside>

    <section className={`relative flex min-h-screen items-start justify-center px-6 pb-20 pt-[100px] tablet:items-center tablet:px-10 tablet:pb-[75px] tablet:pt-[90px] ${desktopHeight}`}>
      <button className="absolute left-5 top-7 border-0 bg-transparent text-[13px] text-[#756b77] tablet:left-[46px] tablet:top-10" onClick={() => navigate('/')}><span className="mr-2">←</span> Back to home</button>
      <div className="absolute right-6 top-[29px] tablet:hidden [&_button]:text-[13px] [&_img]:size-[27px]"><Brand /></div>
      {children}
      <p className="absolute bottom-[22px] px-5 text-center text-[9px] text-[#a69da7] tablet:bottom-[26px] tablet:px-0">By continuing, you agree to our <a className="text-[#766c78]" href="#terms">Terms</a> and <a className="text-[#766c78]" href="#privacy">Privacy Policy</a>.</p>
    </section>
  </main>
}
