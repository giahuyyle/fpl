import { useState } from 'react'
import type { FormEvent } from 'react'
import { navigate } from '../../shared/lib/navigation'
import { Brand } from '../../shared/ui/Brand'
import { Icon } from '../../shared/ui/Icon'
import './login.css'

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('Authentication will be available when the API is connected.')
  }

  return <main className="login-page"><aside className="login-visual"><div className="login-brand"><Brand light /></div><div className="visual-copy"><span className="visual-kicker">MATCHDAY STARTS HERE</span><blockquote>“Football is played with the head. Your feet are just the tools.”</blockquote><p>Build smarter. Rise higher.</p></div><div className="formation-lines" aria-hidden="true"><span /><span /><span /></div><div className="visual-footer"><span>© 2026 Fantasy PL</span><span>Made for the game.</span></div></aside><section className="login-panel"><button className="back-button" onClick={() => navigate('/')}><span>←</span> Back to home</button><div className="login-box"><div className="mobile-brand"><Brand /></div><span className="login-kicker">WELCOME BACK</span><h1>Ready for the next<br />gameweek?</h1><p className="login-intro">Log in to manage your squad, make transfers and see how you rank.</p><form onSubmit={submit}><label htmlFor="email">Email address</label><div className="input-wrap"><Icon name="mail" size={19} /><input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></div><div className="password-label"><label htmlFor="password">Password</label><a href="#forgot">Forgot password?</a></div><div className="input-wrap"><Icon name="lock" size={19} /><input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name="eye" size={19} /></button></div><label className="remember"><input type="checkbox" /> <span>Keep me logged in</span></label><button className="button button-primary login-submit" type="submit">Log in to Fantasy PL <Icon name="arrow" size={18} /></button>{message && <p className="form-message" role="status">{message}</p>}</form><div className="divider"><span>OR CONTINUE WITH</span></div><div className="social-buttons"><button><span className="google-g">G</span> Google</button><button><span className="apple">●</span> Apple</button></div><p className="sign-up">New to Fantasy PL? <a href="#signup">Create an account</a></p></div><p className="legal">By continuing, you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</p></section></main>
}
