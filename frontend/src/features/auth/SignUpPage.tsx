import { useState } from 'react'
import type { FormEvent } from 'react'
import { navigate } from '../../shared/lib/navigation'
import { Icon } from '../../shared/ui/Icon'
import { createUser } from './api/createUser'
import { fieldClass, inputClass, labelClass, primaryButtonClass } from './authStyles'
import { AuthShell } from './components/AuthShell'
import { SocialLogin } from './components/SocialLogin'

export function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [hasError, setHasError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    if (form.get('password') !== form.get('confirmPassword')) {
      setHasError(true)
      setMessage('Your passwords do not match.')
      return
    }

    setHasError(false)
    setMessage('')
    setIsSubmitting(true)

    try {
      await createUser({
        username: String(form.get('username')).trim(),
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
      })
      navigate('/squad')
    } catch (error) {
      setHasError(true)
      setMessage(error instanceof Error ? error.message : 'Unable to create your account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <AuthShell tall kicker="YOUR SEASON STARTS HERE" quote="Every gameweek starts with a team you believe in." tagline="Create your account. Make every match matter.">
    <div className="w-full max-w-[440px]">
      <span className="flex items-center gap-2 font-display text-[11px] font-bold leading-none tracking-[.18em] text-pl-pink">JOIN FANTASY PL</span>
      <h1 className="my-4 font-display text-[35px] font-extrabold leading-[1.08] tracking-[-.04em] text-pl-purple tablet:text-[40px]" aria-label="Build your first squad.">Build your first<br />squad.</h1>
      <p className="mb-7 max-w-[410px] text-sm leading-[1.55] text-muted">Create an account to pick your team, join private leagues and follow every point live.</p>

      <form onSubmit={submit}>
        <label className={labelClass} htmlFor="username">Username</label>
        <div className={fieldClass}><Icon name="user" size={19} /><input className={inputClass} id="username" name="username" type="text" placeholder="Choose a username" autoComplete="username" required /></div>

        <label className={`${labelClass} mt-[18px]`} htmlFor="signup-email">Email address</label>
        <div className={fieldClass}><Icon name="mail" size={19} /><input className={inputClass} id="signup-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></div>

        <label className={`${labelClass} mt-[18px]`} htmlFor="signup-password">Password</label>
        <div className={fieldClass}><Icon name="lock" size={19} /><input className={inputClass} id="signup-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Create a password" autoComplete="new-password" minLength={8} aria-describedby="password-hint" required /><button className="grid place-items-center border-0 bg-transparent p-[3px] text-[#887d89]" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}><Icon name="eye" size={19} /></button></div>
        <p className="mb-0 mt-1.5 text-[10px] text-[#8d828f]" id="password-hint">Use at least 8 characters.</p>

        <label className={`${labelClass} mt-[14px]`} htmlFor="confirm-password">Confirm password</label>
        <div className={fieldClass}><Icon name="lock" size={19} /><input className={inputClass} id="confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Repeat your password" autoComplete="new-password" minLength={8} required /></div>

        <label className="my-[15px] flex items-start gap-2 text-[11px] leading-[1.45] text-[#716772]"><input className="mt-0.5 size-[15px] shrink-0 accent-pl-purple" type="checkbox" required /><span>I agree to the <a className="font-bold text-pl-purple" href="#terms">Terms</a> and <a className="font-bold text-pl-purple" href="#privacy">Privacy Policy</a>.</span></label>
        <button className={primaryButtonClass} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create my account'} {!isSubmitting && <Icon name="arrow" size={18} />}</button>
        {message && <p className={`mt-2.5 text-center text-[11px] ${hasError ? 'text-pl-pink' : 'text-pl-purple'}`} role="status">{message}</p>}
      </form>

      <SocialLogin />
      <p className="mt-6 text-center text-xs text-[#786e79]">Already have an account? <button className="border-0 bg-transparent p-0 font-bold text-pl-purple" onClick={() => navigate('/login')}>Log in</button></p>
    </div>
  </AuthShell>
}
