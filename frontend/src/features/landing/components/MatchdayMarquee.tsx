const matchdayFeatures = ['Live points', 'Smart transfers', 'Private leagues', 'Captain calls', 'Bench decisions']

export function MatchdayMarquee() {
  return <div className="matchday-marquee" aria-label="Fantasy PL features"><div>{[...matchdayFeatures, ...matchdayFeatures].map((item, index) => <span key={`${item}-${index}`}>{item}<i /></span>)}</div></div>
}
