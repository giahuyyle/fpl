import { useState } from 'react'
import type { FormEvent } from 'react'
import { navigate } from '../../shared/lib/navigation'
import { Brand } from '../../shared/ui/Brand'
import { Icon } from '../../shared/ui/Icon'

const fieldClass = 'flex h-12 items-center gap-3 rounded border border-[#ded8e0] px-3.5 text-[#8d828f] transition focus-within:border-pl-purple focus-within:shadow-[0_0_0_3px_#37003c18]'
const inputClass = 'h-full w-full border-0 bg-transparent text-[13px] text-pl-purple outline-0 placeholder:text-[#a69da7]'

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('Authentication will be available when the API is connected.')
  }

  return <main className="min-h-screen bg-white tablet:grid tablet:grid-cols-[minmax(420px,44%)_1fr] wide:grid-cols-[38%_62%]">
    <aside className="relative hidden min-h-[720px] overflow-hidden bg-pl-purple bg-[radial-gradient(circle_at_20%_15%,#68006f_0,transparent_31%),linear-gradient(135deg,transparent_40%,#00ff8510_40%_60%,transparent_60%)] px-[55px] py-[42px] text-white before:absolute before:-bottom-60 before:-left-44 before:size-[620px] before:rounded-full before:border before:border-white/10 after:absolute after:right-[-120px] after:top-[110px] after:h-[560px] after:w-80 after:rotate-[25deg] after:border after:border-pl-cyan/20 tablet:block wide:px-[30px] wide:py-[38px]">
      <Brand light />
      <div className="relative z-[2] mt-[min(26vh,210px)] max-w-[510px]">
        <span className="flex items-center gap-2 font-display text-[11px] font-bold leading-none tracking-[.18em] text-pl-green">MATCHDAY STARTS HERE</span>
        <blockquote className="my-7 font-display text-[clamp(35px,3.2vw,50px)] font-bold leading-[1.15] tracking-[-.045em] wide:text-[32px]">“Football is played with the head. Your feet are just the tools.”</blockquote>
        <p className="text-[#d4bed7]">Build smarter. Rise higher.</p>
      </div>
      <div className="absolute bottom-[70px] right-10 opacity-50" aria-hidden="true">
        <span className="absolute bottom-[50px] right-[120px] size-[11px] rounded-full border-2 border-pl-green" />
        <span className="absolute bottom-[140px] right-[35px] size-[11px] rounded-full border-2 border-pl-green" />
        <span className="absolute bottom-[200px] right-[170px] size-[11px] rounded-full border-2 border-pl-green" />
      </div>
      <div className="absolute bottom-[37px] left-[55px] right-[55px] z-[2] flex justify-between text-[10px] text-[#a589a8] wide:left-[30px] wide:right-[30px]"><span>© 2026 Fantasy PL</span><span>Made for the game.</span></div>
    </aside>

    <section className="relative flex min-h-screen items-start justify-center px-6 pb-20 pt-[100px] tablet:min-h-[720px] tablet:items-center tablet:px-10 tablet:pb-[75px] tablet:pt-[90px]">
      <button className="absolute left-5 top-7 border-0 bg-transparent text-[13px] text-[#756b77] tablet:left-[46px] tablet:top-10" onClick={() => navigate('/')}><span className="mr-2">←</span> Back to home</button>
      <div className="w-full max-w-[410px]">
        <div className="absolute right-6 top-[29px] tablet:hidden [&_button]:text-[13px] [&_img]:size-[27px]"><Brand /></div>
        <span className="flex items-center gap-2 font-display text-[11px] font-bold leading-none tracking-[.18em] text-pl-pink">WELCOME BACK</span>
        <h1 className="my-4 font-display text-[35px] font-extrabold leading-[1.11] tracking-[-.04em] text-pl-purple tablet:text-[40px]">Ready for the next<br />gameweek?</h1>
        <p className="mb-[30px] max-w-[385px] text-sm leading-[1.55] text-muted">Log in to manage your squad, make transfers and see how you rank.</p>
        <form onSubmit={submit}>
          <label className="mb-2 block text-xs font-bold text-[#3d2940]" htmlFor="email">Email address</label>
          <div className={fieldClass}><Icon name="mail" size={19} /><input className={inputClass} id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></div>
          <div className="mt-5 flex items-center justify-between"><label className="mb-2 block text-xs font-bold text-[#3d2940]" htmlFor="password">Password</label><a className="mb-2 text-[11px] font-bold text-pl-purple no-underline" href="#forgot">Forgot password?</a></div>
          <div className={fieldClass}><Icon name="lock" size={19} /><input className={inputClass} id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" required /><button className="grid place-items-center border-0 bg-transparent p-[3px] text-[#887d89]" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name="eye" size={19} /></button></div>
          <label className="my-[15px] flex items-center gap-1.5 text-xs font-medium text-[#716772]"><input className="size-[15px] accent-pl-purple" type="checkbox" /><span>Keep me logged in</span></label>
          <button className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded bg-pl-green px-6 font-bold text-pl-purple-dark shadow-[0_8px_25px_#00ff8538] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_#00ff8552]" type="submit">Log in to Fantasy PL <Icon name="arrow" size={18} /></button>
          {message && <p className="mt-2.5 text-center text-[11px] text-pl-purple" role="status">{message}</p>}
        </form>
        <div className="my-[18px] mt-[26px] flex items-center gap-[13px] text-[8px] font-bold tracking-[.15em] text-[#9f97a0]"><i className="flex-1 border-t border-[#e8e3e9]" /><span>OR CONTINUE WITH</span><i className="flex-1 border-t border-[#e8e3e9]" /></div>
        <div className="grid grid-cols-2 gap-[11px] [&_button]:h-[45px] [&_button]:rounded [&_button]:border [&_button]:border-[#e0dbe2] [&_button]:bg-white [&_button]:text-xs [&_button]:font-semibold [&_button]:text-[#463849]"><button><span className="mr-[7px] text-[15px] font-extrabold text-[#4285f4]">G</span> Google</button><button><span className="mr-2 text-[#111]">●</span> Apple</button></div>
        <p className="mt-6 text-center text-xs text-[#786e79]">New to Fantasy PL? <a className="font-bold text-pl-purple no-underline" href="#signup">Create an account</a></p>
      </div>
      <p className="absolute bottom-[22px] px-5 text-center text-[9px] text-[#a69da7] tablet:bottom-[26px] tablet:px-0">By continuing, you agree to our <a className="text-[#766c78]" href="#terms">Terms</a> and <a className="text-[#766c78]" href="#privacy">Privacy Policy</a>.</p>
    </section>
  </main>
}
