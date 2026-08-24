const matchdayFeatures = ['Live points', 'Smart transfers', 'Private leagues', 'Captain calls', 'Bench decisions']

export function MatchdayMarquee() {
  return <div className="group h-[62px] overflow-hidden border-b border-pl-purple bg-pl-green tablet:h-[74px]" aria-label="Fantasy PL features"><div className="flex h-full w-max animate-marquee items-center group-hover:[animation-play-state:paused]">{[...matchdayFeatures, ...matchdayFeatures].map((item, index) => <span className="flex items-center gap-[34px] pr-[34px] font-display text-sm font-extrabold uppercase tracking-[-.03em] text-pl-purple tablet:text-[17px]" key={`${item}-${index}`}>{item}<i className="block size-[7px] rounded-full bg-pl-pink" /></span>)}</div></div>
}
