import { navigate } from '../../shared/lib/navigation'
import { Icon } from '../../shared/ui/Icon'
import { GameLoop } from './components/GameLoop'
import { LandingFooter } from './components/LandingFooter'
import { LandingHeader } from './components/LandingHeader'
import { MatchdayMarquee } from './components/MatchdayMarquee'
import { ProductBento } from './components/ProductBento'
import { SquadStage } from './components/SquadStage'
import './landing.css'

function CommunitySection() {
  return <section className="community-section" id="community"><div className="quote-mark">“</div><blockquote>There is no passive way to watch football once your captain is on the pitch.</blockquote><div className="quote-caption"><span>FANTASY PL MANAGER</span><p>The weekend means more when every minute counts.</p></div></section>
}

function FinalCta() {
  return <section className="final-cta"><div className="cta-ball" aria-hidden="true"><Icon name="ball" size={88} /></div><span>YOUR TEAM. YOUR CALLS.</span><h2>Think you know<br />football?</h2><button className="pill-button pill-dark" onClick={() => navigate('/login')}>Build your first XI <Icon name="arrow" size={18} /></button></section>
}

export function LandingPage() {
  return <main className="taste-landing"><section className="taste-hero"><LandingHeader /><div className="hero-grid-lines" aria-hidden="true" /><div className="taste-hero-copy"><p className="hero-overline"><span /> Fantasy football, fully felt</p><h1 aria-label="Make football yours."><span>MAKE</span><span>FOOTBALL</span><span><em>YOURS.</em></span></h1><div className="hero-lower"><p>Build the squad you believe in. Turn every pass, tackle and late winner into a reason to care more.</p><div className="hero-actions"><button className="pill-button pill-acid" onClick={() => navigate('/login')}>Build your first XI <Icon name="arrow" size={18} /></button></div></div></div><div className="hero-product"><span className="hero-product-label">Your weekend,<br />under new management.</span><SquadStage /></div></section><MatchdayMarquee /><ProductBento /><GameLoop /><CommunitySection /><FinalCta /><LandingFooter /></main>
}
