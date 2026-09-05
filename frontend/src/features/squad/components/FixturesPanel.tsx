import type { Fixture, Gameweek } from '../api/squadApi'
import { teamBadge } from '../squadConfig'

type Props = {
  fixtures?: Fixture[]
  gameweeks: Gameweek[]
  onGameweekChange?: (number: number) => void
  selectedGameweekNumber?: number
}

function status(fixture: Fixture) {
  if (fixture.finished || fixture.finished_provisional) return 'FT'
  if (fixture.started) return `${fixture.minutes}'`
  if (!fixture.kickoff_time) return 'TBD'
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(fixture.kickoff_time))
}

function score(fixture: Fixture) {
  if (!fixture.started && !fixture.finished) return 'vs'
  return `${fixture.home_score ?? 0} – ${fixture.away_score ?? 0}`
}

export function FixturesPanel({ fixtures = [], gameweeks, onGameweekChange, selectedGameweekNumber }: Props) {
  const fallback = gameweeks.find((item) => !item.finished) ?? gameweeks.at(-1)
  const gameweek = gameweeks.find((item) => item.number === selectedGameweekNumber) ?? fallback
  const index = gameweek ? gameweeks.findIndex((item) => item.id === gameweek.id) : -1
  const matches = gameweek ? fixtures.filter((fixture) => fixture.gameweek_id === gameweek.id) : []
  const groups = matches.reduce<Record<string, Fixture[]>>((result, fixture) => {
    const key = fixture.kickoff_time
      ? new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(fixture.kickoff_time))
      : 'Date to be announced'
    ;(result[key] ??= []).push(fixture)
    return result
  }, {})

  return <section className="mt-8 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_#17001916]" aria-labelledby="fixtures-heading">
    <div className="flex items-center justify-between gap-3 border-b border-[#e9e3ea] px-5 py-6 tablet:px-8">
      <button aria-label="Previous gameweek" className="grid size-9 place-items-center rounded-full bg-[#f0eaf1] text-lg font-black text-pl-purple disabled:opacity-30" disabled={index <= 0} onClick={() => onGameweekChange?.(gameweeks[index - 1].number)} type="button">‹</button>
      <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[.18em] text-pl-pink">{gameweek?.name ?? 'Match centre'}</p><h2 className="mt-1 font-display text-2xl font-extrabold tracking-[-.04em] text-pl-purple" id="fixtures-heading">Fixtures</h2></div>
      <button aria-label="Next gameweek" className="grid size-9 place-items-center rounded-full bg-[#f0eaf1] text-lg font-black text-pl-purple disabled:opacity-30" disabled={index < 0 || index >= gameweeks.length - 1} onClick={() => onGameweekChange?.(gameweeks[index + 1].number)} type="button">›</button>
    </div>
    {matches.length === 0
      ? <div className="grid min-h-[180px] place-items-center px-5 py-10 text-center"><h3 className="font-display text-lg font-extrabold text-pl-purple">Fixtures unavailable</h3></div>
      : <div className="px-5 py-5 tablet:px-8">{Object.entries(groups).map(([date, dayFixtures]) => <div className="mb-6 last:mb-0" key={date}>
        <h3 className="mb-2 text-[10px] font-black uppercase tracking-[.13em] text-muted">{date}</h3>
        <div className="divide-y divide-[#eee8ef]">{dayFixtures.map((fixture) => <article className="grid grid-cols-[36px_1fr_auto_1fr] items-center gap-2 py-3 text-xs" key={fixture.id}>
          <span className={`font-black ${fixture.started && !fixture.finished ? 'text-pl-pink' : 'text-muted'}`}>{status(fixture)}</span>
          <span className="flex min-w-0 items-center justify-end gap-2 text-right font-bold text-pl-purple"><span className="truncate">{fixture.home_team.name}</span><img alt="" className="size-6 object-contain" src={teamBadge(fixture.home_team.code)} /></span>
          <strong className={`min-w-12 rounded-lg px-2 py-1.5 text-center ${fixture.started || fixture.finished ? 'bg-pl-purple text-white' : 'bg-[#f0eaf1] text-pl-purple'}`}>{score(fixture)}</strong>
          <span className="flex min-w-0 items-center gap-2 font-bold text-pl-purple"><img alt="" className="size-6 object-contain" src={teamBadge(fixture.away_team.code)} /><span className="truncate">{fixture.away_team.name}</span></span>
        </article>)}</div>
      </div>)}</div>}
  </section>
}
