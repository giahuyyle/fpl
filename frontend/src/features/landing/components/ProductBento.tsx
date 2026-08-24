import { Icon } from '../../../shared/ui/Icon'
import { SquadStage } from './SquadStage'

export function ProductBento() {
  return <section className="product-section" id="features"><div className="section-intro"><p>INSIDE FANTASY PL</p><h2>One place for every call that <em>changes your weekend.</em></h2></div><div className="product-bento">
    <article className="bento-card bento-squad"><div className="bento-copy"><span>PLAN</span><h3>See the whole pitch.</h3><p>Shape your squad, balance the budget and make every position count before the deadline.</p></div><SquadStage compact /></article>
    <article className="bento-card bento-live"><div className="live-top"><span className="live-dot">LIVE</span><span>ARS 2–1 MCI</span><span>78:24</span></div><div className="live-score"><span>GAMEWEEK</span><strong>64</strong><p>+9 points in play</p></div><div className="score-wave" aria-hidden="true"><svg viewBox="0 0 600 100" preserveAspectRatio="none"><path d="M0 82 C70 90 75 50 140 61 S218 82 278 41 385 73 445 25 520 50 600 5"/><path className="wave-fill" d="M0 82 C70 90 75 50 140 61 S218 82 278 41 385 73 445 25 520 50 600 5 V100 H0Z"/></svg></div></article>
    <article className="bento-card bento-transfer"><span className="bento-icon"><Icon name="swap" /></span><div><span>TRANSFER DESK</span><strong>Palmer</strong><small>Form rising · next: BHA (H)</small></div><button aria-label="Add Palmer to squad">+</button></article>
    <article className="bento-card bento-league"><span className="bento-icon"><Icon name="users" /></span><div><span>FRIENDS LEAGUE</span><strong>You moved up to 2nd</strong></div><div className="league-stack"><i>JL</i><i>AK</i><i>YOU</i></div></article>
  </div></section>
}
