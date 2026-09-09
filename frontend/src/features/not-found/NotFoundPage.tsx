import { navigate } from '../../shared/lib/navigation'
import { Icon } from '../../shared/ui/Icon'
import { SiteHeader } from '../../shared/ui/SiteHeader'
import './notFound.css'

export function NotFoundPage() {
  return <div className="not-found-page">
    <SiteHeader />

    <main className="not-found-main">
      <section className="not-found-copy" aria-labelledby="not-found-title">
        <p className="not-found-kicker"><span /> Full-time whistle</p>
        <h1 aria-label="You’ve gone offside." id="not-found-title">You’ve gone<br /><em>offside.</em></h1>
        <p className="not-found-description">The page you’re looking for has drifted beyond the last defender. Let’s get you back into play.</p>
        <div className="not-found-actions">
          <button className="not-found-primary" onClick={() => navigate('/')} type="button">
            Back to home <Icon name="arrow" size={18} />
          </button>
          <button className="not-found-secondary" onClick={() => navigate('/players')} type="button">Browse players</button>
        </div>
      </section>

      <div className="not-found-score" aria-hidden="true">
        <div className="not-found-score-number">4</div>
        <div className="not-found-pitch">
          <span className="not-found-pitch-box" />
          <span className="not-found-pitch-circle" />
          <span className="not-found-ball"><Icon name="ball" size={44} /></span>
          <span className="not-found-flag" />
        </div>
        <div className="not-found-score-number">4</div>
      </div>
    </main>

    <footer className="not-found-footer">
      <span>ERROR 404</span>
      <span>Wrong turn. Right game.</span>
    </footer>
  </div>
}
