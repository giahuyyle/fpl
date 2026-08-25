import { useState } from 'react'
import type { FormEvent } from 'react'
import { navigate } from '../../shared/lib/navigation'
import { Icon } from '../../shared/ui/Icon'
import { login } from './api/session'
import { fieldClass, inputClass, labelClass, primaryButtonClass } from './authStyles'
import { AuthShell } from './components/AuthShell'
import { SocialLogin } from './components/SocialLogin'

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState(() => new URLSearchParams(window.location.search).get('created') === '1' ? 'Account created. You can log in now.' : '')
  const [hasError, setHasError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setHasError(false)
    setMessage('')
    setIsSubmitting(true)

    try {
      await login({
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
        remember_me: form.get('rememberMe') === 'on',
      })
      navigate('/account')
    } catch (error) {
      setHasError(true)
      setMessage(error instanceof Error ? error.message : 'Unable to log in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <AuthShell kicker="MATCHDAY STARTS HERE" quote="Football is played with the head. Your feet are just the tools." tagline="Build smarter. Rise higher.">
      <div className="w-full max-w-[410px]">
        <span className="flex items-center gap-2 font-display text-[11px] font-bold leading-none tracking-[.18em] text-pl-pink">WELCOME BACK</span>
        <h1 className="my-4 font-display text-[35px] font-extrabold leading-[1.11] tracking-[-.04em] text-pl-purple tablet:text-[40px]">Ready for the next<br />gameweek?</h1>
        <p className="mb-[30px] max-w-[385px] text-sm leading-[1.55] text-muted">Log in to manage your squad, make transfers and see how you rank.</p>
        <form onSubmit={submit}>
          <label className={labelClass} htmlFor="email">Email address</label>
          <div className={fieldClass}><Icon name="mail" size={19} /><input className={inputClass} id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></div>
          <div className="mt-5 flex items-center justify-between"><label className={labelClass} htmlFor="password">Password</label><a className="mb-2 text-[11px] font-bold text-pl-purple no-underline" href="#forgot">Forgot password?</a></div>
          <div className={fieldClass}><Icon name="lock" size={19} /><input className={inputClass} id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" required /><button className="grid place-items-center border-0 bg-transparent p-[3px] text-[#887d89]" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name="eye" size={19} /></button></div>
          <label className="my-[15px] flex items-center gap-1.5 text-xs font-medium text-[#716772]"><input className="size-[15px] accent-pl-purple" name="rememberMe" type="checkbox" /><span>Keep me logged in</span></label>
          <button className={primaryButtonClass} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in…' : 'Log in to Fantasy PL'} {!isSubmitting && <Icon name="arrow" size={18} />}</button>
          {message && <p className={`mt-2.5 text-center text-[11px] ${hasError ? 'text-pl-pink' : 'text-pl-purple'}`} role="status">{message}</p>}
        </form>
        <SocialLogin />
        <p className="mt-6 text-center text-xs text-[#786e79]">New to Fantasy PL? <button className="border-0 bg-transparent p-0 font-bold text-pl-purple" onClick={() => navigate('/signup')}>Create an account</button></p>
      </div>
  </AuthShell>
}
