import type { Gameweek } from '../api/squadApi'

export function FixturesPanel({ gameweeks }: { gameweeks: Gameweek[] }) {
  const gameweek = gameweeks.find((item) => !item.finished) ?? gameweeks.at(-1)
  const deadline = gameweek ? new Intl.DateTimeFormat(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(gameweek.deadline_time)) : null

  return <section className="mt-8 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_#17001916]" aria-labelledby="fixtures-heading">
    <div className="flex flex-col gap-5 border-b border-[#e9e3ea] px-5 py-7 tablet:flex-row tablet:items-end tablet:justify-between tablet:px-8">
      <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-pl-pink">Match centre</p><h2 className="mt-1 font-display text-3xl font-extrabold tracking-[-.04em] text-pl-purple" id="fixtures-heading">Fixtures</h2></div>
      {gameweek && <div className="tablet:text-right"><strong className="block text-sm text-pl-purple">{gameweek.name}</strong><span className="mt-1 block text-xs text-muted">Deadline · {deadline}</span></div>}
    </div>
    <div className="grid min-h-[220px] place-items-center px-5 py-10 text-center">
      <div><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#f0eaf1] font-display text-xl font-black text-pl-purple">VS</span><h3 className="mt-4 font-display text-lg font-extrabold text-pl-purple">Fixtures unavailable</h3></div>
    </div>
  </section>
}
