import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { navigate } from '../../shared/lib/navigation'
import { SiteHeader } from '../../shared/ui/SiteHeader'
import { AuthenticationRequiredError, changePassword, defaultAccountSettings, getCurrentUser, logout, updateAccount } from './api/session'
import type { AccountSettings, User } from './api/session'
import './account.css'

const sections = ['Personal details', 'Email address', 'Email preferences', 'Account security', 'Appearance', 'Interests', 'Manage account'] as const
type Section = typeof sections[number]
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = 'AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR BN BG BF BI CV KH CM CA KY CF TD CL CN CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PL PT PR QA RE RO RU RW KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UY UZ VU VA VE VN VI WF YE ZM ZW'.split(' ').map(code => ({ code, name: regionNames.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name))

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="account-field"><span>{label}</span>{children}</label>
}
function CountrySelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><select value={value} onChange={e => onChange(e.target.value)}><option value="">Select a country</option>{countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select></Field>
}

export function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<AccountSettings>(defaultAccountSettings)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [section, setSection] = useState<Section>('Personal details')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })

  useEffect(() => {
    let active = true
    getCurrentUser().then(current => {
      if (!active) return
      setUser(current); setSettings({ ...defaultAccountSettings, ...current.settings }); setUsername(current.username); setEmail(current.email)
    }).catch((reason: unknown) => {
      if (!active) return
      if (reason instanceof AuthenticationRequiredError) navigate('/login')
      else setError(reason instanceof Error ? reason.message : 'Unable to load your account.')
    })
    return () => { active = false }
  }, [attempt])

  function edit(patch: Partial<AccountSettings>) { setSettings(current => ({ ...current, ...patch })); setSuccess('') }
  function selectSection(next: Section) { setSection(next); setError(''); setSuccess(''); setPasswords({ current: '', next: '', confirm: '' }) }
  function handleError(reason: unknown) {
    if (reason instanceof AuthenticationRequiredError) navigate('/login')
    else setError(reason instanceof Error ? reason.message : 'Unable to save changes. Please try again.')
  }
  async function submitLogout() {
    setIsLoggingOut(true); setError('')
    try { await logout(); navigate('/login') } catch (reason) { handleError(reason); setIsLoggingOut(false) }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSuccess('')
    if (section === 'Account security' && passwords.next !== passwords.confirm) { setError('New passwords do not match.'); return }
    setBusy(true)
    try {
      if (section === 'Account security') {
        await changePassword(passwords.current, passwords.next)
        navigate('/login')
      } else {
        let patch: Partial<AccountSettings> = {}
        if (section === 'Personal details') {
          const { first_name, last_name, date_of_birth, gender, country, nationality, different_nationality } = settings
          patch = { first_name, last_name, date_of_birth, gender, country, nationality: different_nationality ? nationality : country, different_nationality }
        } else if (section === 'Email preferences') patch = { email_news: settings.email_news, email_fantasy: settings.email_fantasy }
        else if (section === 'Appearance') patch = { appearance: settings.appearance }
        else if (section === 'Interests') patch = { interests: settings.interests }
        const updated = await updateAccount(section === 'Email address' ? { email } : { ...(section === 'Personal details' ? { username } : {}), settings: patch })
        setUser(updated); setSuccess('Your changes have been saved.')
      }
    } catch (reason) { handleError(reason) } finally { setBusy(false) }
  }

  const saved = { ...defaultAccountSettings, ...user?.settings }
  function reset() {
    setSettings(saved); setUsername(user?.username ?? ''); setEmail(user?.email ?? ''); setPasswords({ current: '', next: '', confirm: '' }); setError(''); setSuccess('')
  }
  return <div className="account-page" data-appearance={settings.appearance}>
    <SiteHeader actions={user ? <button disabled={isLoggingOut || busy} onClick={submitLogout}>{isLoggingOut ? 'Logging out…' : 'Log out'}</button> : undefined} />
    <main className="account-container">
      <div className="account-banner"><h1>myPremierLeague Settings</h1></div>
      {!user ? <section className="account-panel account-loading">{error ? <><p role="alert">{error}</p><button className="account-primary" onClick={() => { setError(''); setAttempt(n => n + 1) }}>Try again</button></> : <p role="status">Loading your account…</p>}</section> : <div className="account-layout">
        <nav className="account-menu" aria-label="Account settings">{sections.map((item, index) => <button key={item} type="button" className={index === 4 ? 'account-menu-divider' : ''} aria-current={section === item ? 'page' : undefined} onClick={() => selectSection(item)} disabled={busy}>{item}</button>)}</nav>
        <section className="account-panel" aria-labelledby="account-section-heading">
          <h2 id="account-section-heading">{section}</h2>
          <form onSubmit={save} className="account-form">
            <fieldset disabled={busy || isLoggingOut}>
              {section === 'Personal details' && <>
                <div className="account-name-fields"><Field label="First name"><input autoComplete="given-name" maxLength={100} value={settings.first_name} onChange={e => edit({ first_name: e.target.value })} /></Field><Field label="Last name"><input autoComplete="family-name" maxLength={100} value={settings.last_name} onChange={e => edit({ last_name: e.target.value })} /></Field></div>
                <Field label="User ID"><input readOnly value={user.id} className="account-readonly" /></Field>
                <Field label="Date of birth"><input type="date" autoComplete="bday" max={new Date().toLocaleDateString('en-CA')} value={settings.date_of_birth ?? ''} onChange={e => edit({ date_of_birth: e.target.value || null })} /></Field>
                <Field label="Gender"><select value={settings.gender} onChange={e => edit({ gender: e.target.value as AccountSettings['gender'] })}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="non-binary">Non-binary</option><option value="prefer-not-to-say">Prefer not to say</option></select></Field>
                <CountrySelect label="Country of residence" value={settings.country} onChange={country => edit({ country })} />
                <label className="account-check nationality-check"><input type="checkbox" checked={settings.different_nationality} onChange={e => edit({ different_nationality: e.target.checked })} /><span>My nationality differs from country of residence</span></label>
                {settings.different_nationality && <CountrySelect label="Nationality" value={settings.nationality} onChange={nationality => edit({ nationality })} />}
                <Field label="Username"><input required minLength={3} maxLength={50} pattern="[A-Za-z0-9_.\-]+" autoComplete="username" value={username} onChange={e => { setUsername(e.target.value); setSuccess('') }} /></Field>
              </>}
              {section === 'Email address' && <><p className="account-description">Use this email address to log in to your account.</p><Field label="Email address"><input type="email" required autoComplete="email" maxLength={320} value={email} onChange={e => { setEmail(e.target.value); setSuccess('') }} /></Field><p className="account-hint">Changing your email address updates your sign-in details.</p></>}
              {section === 'Email preferences' && <><p className="account-description">Choose the updates you would like to receive.</p><label className="account-check preference-check"><input type="checkbox" checked={settings.email_news} onChange={e => edit({ email_news: e.target.checked })} /><span><strong>Premier League news</strong><small>Match news, league updates and player stories.</small></span></label><label className="account-check preference-check"><input type="checkbox" checked={settings.email_fantasy} onChange={e => edit({ email_fantasy: e.target.checked })} /><span><strong>Fantasy updates</strong><small>Gameweek reminders and Fantasy news.</small></span></label><p className="account-hint">Preferences are saved to your account. Email delivery is not available yet.</p></>}
              {section === 'Account security' && <><p className="account-description">Choose a new password to keep your account secure.</p><Field label="Current password"><input type="password" required autoComplete="current-password" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} /></Field><Field label="New password"><input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={passwords.next} onChange={e => setPasswords({ ...passwords, next: e.target.value })} /></Field><Field label="Confirm new password"><input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} /></Field><p className="account-hint">Use at least 8 characters. After changing your password, log in again on each device.</p></>}
              {section === 'Appearance' && <><p className="account-description">Choose how your account settings look.</p><div className="appearance-options">{(['light', 'dark', 'system'] as const).map(mode => <label className="account-check preference-check" key={mode}><input type="radio" name="appearance" checked={settings.appearance === mode} onChange={() => edit({ appearance: mode })} /><span><strong>{mode === 'system' ? 'Use device settings' : `${mode[0].toUpperCase()}${mode.slice(1)} mode`}</strong></span></label>)}</div></>}
              {section === 'Interests' && <><p className="account-description">Tell us which parts of the game you enjoy.</p>{(['matches', 'fantasy', 'players', 'clubs'] as const).map(interest => <label className="account-check preference-check" key={interest}><input type="checkbox" checked={settings.interests.includes(interest)} onChange={e => edit({ interests: e.target.checked ? [...settings.interests, interest] : settings.interests.filter(item => item !== interest) })} /><span>{interest[0].toUpperCase()}{interest.slice(1)}</span></label>)}</>}
              {section === 'Manage account' && <><p className="account-description">Your Premier League account.</p><dl className="account-summary"><div><dt>Username</dt><dd>{user.username}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Member since</dt><dd>{new Date(user.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div></dl><button className="account-primary" type="button" onClick={submitLogout}>Sign out of this browser</button></>}
            </fieldset>
            {error && <p className="account-feedback account-error" role="alert">{error}</p>}
            {success && <p className="account-feedback account-success" role="status">{success}</p>}
            {section !== 'Manage account' && <div className="account-form-actions"><button type="submit" className="account-primary" disabled={busy || isLoggingOut}>{busy ? 'Saving…' : section === 'Account security' ? 'Change password' : 'Save changes'}</button><button type="button" className="account-secondary" disabled={busy || isLoggingOut} onClick={reset}>Cancel</button></div>}
          </form>
        </section>
      </div>}
    </main>
  </div>
}
