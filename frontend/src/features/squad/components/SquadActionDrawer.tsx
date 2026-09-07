import { useState } from 'react'
import { Icon } from '../../../shared/ui/Icon'
import type { Fixture, Gameweek, Player, SquadPoints } from '../api/squadApi'
import { playerPhoto, price, teamBadge } from '../squadConfig'
import type { SquadMode } from './SquadPitch'
import './SquadActionDrawer.css'

type Props = {
  mode: SquadMode
  player: Player
  fixtures?: Fixture[]
  gameweeks?: Gameweek[]
  pointsHistory?: SquadPoints[]
  selectedGameweekNumber?: number
  marketAction?: { disabled: boolean; onAdd: () => void }
  removed?: boolean
  isStarter?: boolean
  isCaptain?: boolean
  isViceCaptain?: boolean
  onCaptain?: () => void
  onClose: () => void
  onRemove?: () => void
  onRestore?: () => void
  onSelectReplacement?: () => void
  onSubstitute?: () => void
  onViceCaptain?: () => void
}

function DrawerPortrait({ photo, playerName }: { photo: string | null; playerName: string }) {
  const [failed, setFailed] = useState(false)

  if (!photo || failed) {
    return <span className="grid size-20 place-items-center rounded-full bg-white/45 text-pl-purple" aria-label="Generic player portrait" role="img"><Icon name="user" size={44} /></span>
  }

  return <img alt={`${playerName} portrait`} className="h-full w-full object-contain object-bottom" onError={() => setFailed(true)} src={photo} />
}

type PlayerFixture = {
  gameweek: Gameweek
  opponent: Fixture['home_team'] | Fixture['away_team'] | null
  opponentLabel: string
  difficulty: number | null
  points: number | null
}

function fixtureDifficultyClass(difficulty: number | null) {
  if (difficulty !== null && difficulty <= 2) return 'bg-[#00e87a] text-[#003b25]'
  if (difficulty !== null && difficulty >= 4) return 'bg-pl-pink text-white'
  return 'bg-[#eee9ef] text-pl-purple'
}

function playerFixtures(
  player: Player,
  fixtures: Fixture[],
  gameweeks: Gameweek[],
  pointsHistory: SquadPoints[],
  selectedGameweekNumber?: number,
): PlayerFixture[] {
  const ordered = [...gameweeks].sort((a, b) => a.number - b.number)
  const selectedIndex = ordered.findIndex((gameweek) => gameweek.number === selectedGameweekNumber)
  const start = selectedIndex < 0 ? 0 : Math.max(0, Math.min(selectedIndex - 3, ordered.length - 8))

  return ordered.slice(start, start + 8).map((gameweek) => {
    const fixture = fixtures.find((item) => item.gameweek_id === gameweek.id
      && (item.home_team.id === player.team.id || item.away_team.id === player.team.id))
    const home = fixture?.home_team.id === player.team.id
    const opponent = fixture ? (home ? fixture.away_team : fixture.home_team) : null
    const scoredPick = pointsHistory
      .find((summary) => summary.gameweek.id === gameweek.id)
      ?.picks.find((pick) => pick.player_id === player.id)

    return {
      gameweek,
      opponent,
      opponentLabel: opponent ? `${opponent.short_name} (${home ? 'H' : 'A'})` : '—',
      difficulty: fixture ? (home ? fixture.home_difficulty : fixture.away_difficulty) : null,
      points: scoredPick?.played ? scoredPick.points : null,
    }
  })
}

export function SquadActionDrawer({ mode, player, fixtures = [], gameweeks = [], pointsHistory = [], selectedGameweekNumber, marketAction, removed = false, isStarter = false, isCaptain = false, isViceCaptain = false, onCaptain, onClose, onRemove, onRestore, onSelectReplacement, onSubstitute, onViceCaptain }: Props) {
  const [showFullProfile, setShowFullProfile] = useState(false)
  const photo = playerPhoto(player.photo)
  const upcoming = playerFixtures(player, fixtures, gameweeks, pointsHistory, selectedGameweekNumber)
  const firstName = player.first_name.trim()
  const selectedSummary = pointsHistory.find((summary) => summary.gameweek.number === selectedGameweekNumber)
  const selectedPick = selectedSummary?.picks.find((pick) => pick.player_id === player.id)
  const selectedGameweekName = selectedSummary?.gameweek.name ?? `Gameweek ${selectedGameweekNumber ?? ''}`.trim()
  const selectedFixture = fixtures.find((fixture) => fixture.gameweek_id === selectedSummary?.gameweek.id
    && (fixture.home_team.id === player.team.id || fixture.away_team.id === player.team.id))
  const showGameweekBreakdown = mode === 'view' && selectedPick?.played && !showFullProfile
  const headlineStats = [
    ['Form', player.stats.form ?? 0],
    ['Pts / Match', player.stats.points_per_game ?? 0],
    ['GW Pts', player.stats.event_points ?? 0],
    ['Total Pts', player.stats.total_points ?? 0],
    ['Bonus', player.stats.bonus ?? 0],
    ['ICT Index', player.stats.ict_index ?? 0],
    ['Selected', `${player.stats.selected_by_percent ?? 0}%`],
  ]

  if (showGameweekBreakdown) {
    const fullName = [player.first_name, player.last_name].filter(Boolean).join(' ') || player.web_name
    return <div className="player-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <aside aria-label={`${player.web_name} gameweek points`} aria-modal="true" className="player-drawer player-drawer--gameweek" role="dialog">
        <button aria-label="Close player actions" className="player-drawer-close" onClick={onClose} type="button">×</button>
        <h2 className="player-gameweek-name">{fullName}</h2>

        {selectedFixture && <section aria-label={`${selectedGameweekName} fixture`} className="player-gameweek-match">
          <div className="player-gameweek-club">
            <span>{selectedFixture.home_team.name}</span>
            <img alt={`${selectedFixture.home_team.name} crest`} src={teamBadge(selectedFixture.home_team.code)} />
          </div>
          <div className="player-gameweek-score">
            <strong>{selectedFixture.home_score ?? '–'} - {selectedFixture.away_score ?? '–'}</strong>
            <span>{selectedFixture.finished ? 'FT' : selectedFixture.started ? 'LIVE' : selectedGameweekName}</span>
          </div>
          <div className="player-gameweek-club player-gameweek-club--away">
            <img alt={`${selectedFixture.away_team.name} crest`} src={teamBadge(selectedFixture.away_team.code)} />
            <span>{selectedFixture.away_team.name}</span>
          </div>
        </section>}

        <section className="player-gameweek-breakdown" aria-labelledby="points-breakdown-heading">
          <h3 id="points-breakdown-heading">Points breakdown</h3>
          <table>
            <thead><tr><th scope="col">Statistic</th><th scope="col">Value</th><th scope="col">Points</th></tr></thead>
            <tbody>
              {selectedPick.points_breakdown.map((item) => <tr key={item.statistic}>
                <th scope="row">{item.statistic}</th><td>{item.value}</td><td>{item.points} pts</td>
              </tr>)}
              <tr className="player-gameweek-total"><th scope="row">Total</th><td>—</td><td>{selectedPick.points} pts</td></tr>
            </tbody>
          </table>
        </section>

        <div className="player-drawer-actions">
          <button className="w-full rounded-xl bg-pl-purple px-4 py-3 text-sm font-bold text-white" onClick={() => setShowFullProfile(true)} type="button">View full profile</button>
        </div>
      </aside>
    </div>
  }

  return <div className="player-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside aria-label={`${player.web_name} actions`} aria-modal="true" className="player-drawer" role="dialog">
      <button aria-label="Close player actions" className="player-drawer-close" onClick={onClose} type="button">×</button>

      <div className="player-drawer-hero">
        <div className="player-drawer-hero-inner">
          <div className="player-drawer-portrait">
            <DrawerPortrait key={photo ?? 'missing'} photo={photo} playerName={player.web_name} />
          </div>
          <div className="player-drawer-identity">
            <p className="text-sm font-bold">{player.position.name}</p>
            {firstName && firstName.toLocaleLowerCase() !== player.web_name.toLocaleLowerCase() && <p className="mt-3 text-xl leading-none">{firstName}</p>}
            <h2 className="mt-1 break-words font-display text-4xl font-black leading-none">{player.web_name}</h2>
            <p className="mt-4 flex items-center gap-2 text-sm"><img alt="" className="size-6 object-contain" src={teamBadge(player.team.code)} />{player.team.name}</p>
          </div>
        </div>
      </div>

      <div className="player-drawer-price">
        <span className="text-sm text-pl-purple">Price: <b>{price(player.stats.now_cost)}</b></span>
      </div>

      <dl className="player-drawer-stats">
        {headlineStats.map(([label, value]) => <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>)}
      </dl>

      {upcoming.length > 0 && <section aria-label="Player fixtures" className="mt-4 rounded-2xl bg-white px-4 py-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between px-1"><h3 className="text-sm font-black text-pl-purple">Form</h3><span className="text-sm font-black text-pl-purple">Fixtures</span></div>
        <div className="player-drawer-fixtures">
          {upcoming.map(({ gameweek, opponent, opponentLabel, difficulty, points }) => <div className="min-w-0 text-center" key={gameweek.id}>
            <span className="block text-[9px] text-muted">GW{gameweek.number}</span>
            <div className="mx-auto mt-2 grid size-10 place-items-center">{opponent ? <img alt={`${opponent.name} crest`} className="max-h-9 max-w-9 object-contain" src={teamBadge(opponent.code)} /> : <span className="text-lg text-[#c9c2cb]">—</span>}</div>
            <span className="mt-1 block truncate text-[9px] font-bold text-muted" title={opponentLabel}>{opponentLabel}</span>
            <span className={`mt-2 block rounded-md px-1 py-1 text-[10px] font-black ${points === null ? fixtureDifficultyClass(difficulty) : 'bg-[#f4f1f5] text-pl-purple'}`}>{points === null ? difficulty ?? '—' : `${points}pts`}</span>
          </div>)}
        </div>
      </section>}

      <section className="player-drawer-season" aria-labelledby="player-season-heading">
        <h3 id="player-season-heading">This season</h3>
        <div className="player-drawer-table-scroll">
          <table>
            <thead><tr><th scope="col">Summary</th><th scope="col">Pts</th><th scope="col">Starts</th><th scope="col">Minutes</th><th scope="col">GS</th><th scope="col">A</th><th scope="col">CS</th><th scope="col">GC</th><th scope="col">Bonus</th><th scope="col">ICT</th><th scope="col">DC</th></tr></thead>
            <tbody><tr><th scope="row">Totals</th><td>{player.stats.total_points ?? 0}</td><td>{player.stats.starts ?? 0}</td><td>{player.stats.minutes ?? 0}</td><td>{player.stats.goals_scored ?? 0}</td><td>{player.stats.assists ?? 0}</td><td>{player.stats.clean_sheets ?? 0}</td><td>{player.stats.goals_conceded ?? 0}</td><td>{player.stats.bonus ?? 0}</td><td>{player.stats.ict_index ?? 0}</td><td>{player.stats.defensive_contribution ?? 0}</td></tr></tbody>
          </table>
        </div>
      </section>

      <div className="player-drawer-actions">
        {marketAction && <button className="w-full rounded-xl bg-pl-purple px-4 py-3 text-xs font-bold uppercase tracking-[.08em] text-white disabled:bg-[#d8cfdc] disabled:text-[#88768c]" disabled={marketAction.disabled} onClick={marketAction.onAdd} type="button">{marketAction.disabled ? 'Already selected' : 'Add player'}</button>}
        {mode === 'pick-team' && <>
          <div className="grid grid-cols-2 gap-3">
            <button aria-label={isCaptain ? 'Captain ✓' : 'Make captain'} aria-pressed={isCaptain} className="flex items-center gap-3 border-0 bg-transparent px-1 py-2 text-left text-sm text-muted disabled:opacity-45" disabled={!isStarter} onClick={onCaptain} type="button"><span aria-hidden="true" className={`grid size-6 place-items-center rounded-md border-2 ${isCaptain ? 'border-pl-purple bg-pl-purple text-white' : 'border-[#9f8da4] bg-white'}`}>{isCaptain ? '✓' : ''}</span>Captain</button>
            <button aria-label={isViceCaptain ? 'Vice captain ✓' : 'Make vice captain'} aria-pressed={isViceCaptain} className="flex items-center gap-3 border-0 bg-transparent px-1 py-2 text-left text-sm text-muted disabled:opacity-45" disabled={!isStarter} onClick={onViceCaptain} type="button"><span aria-hidden="true" className={`grid size-6 place-items-center rounded-md border-2 ${isViceCaptain ? 'border-pl-purple bg-pl-purple text-white' : 'border-[#9f8da4] bg-white'}`}>{isViceCaptain ? '✓' : ''}</span>Vice captain</button>
          </div>
          {!isStarter && <p className="mt-2 text-center text-[9px] text-muted">Only starting players can be captain or vice captain.</p>}
          <button className="mt-3 w-full rounded-xl bg-pl-purple px-4 py-3 text-xs font-bold text-white" onClick={onSubstitute} type="button">Substitute</button>
        </>}
        {mode === 'transfers' && !marketAction && <div className="grid grid-cols-2 gap-3">
          <button className="rounded-xl bg-pl-purple px-4 py-3 text-xs font-bold text-white" onClick={removed ? onRestore : onRemove} type="button">{removed ? 'Restore original' : 'Remove player'}</button>
          <button className="rounded-xl bg-pl-purple px-4 py-3 text-xs font-bold text-white" onClick={onSelectReplacement} type="button">Select replacement</button>
        </div>}
      </div>
    </aside>
  </div>
}
