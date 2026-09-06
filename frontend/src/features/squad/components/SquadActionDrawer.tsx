import { useState } from 'react'
import { Icon } from '../../../shared/ui/Icon'
import type { Fixture, Gameweek, Player, SquadPoints } from '../api/squadApi'
import { playerPhoto, price, teamBadge } from '../squadConfig'
import type { SquadMode } from './SquadPitch'

type Props = {
  mode: SquadMode
  player: Player
  fixtures?: Fixture[]
  gameweeks?: Gameweek[]
  pointsHistory?: SquadPoints[]
  selectedGameweekNumber?: number
  removed: boolean
  isStarter: boolean
  isCaptain: boolean
  isViceCaptain: boolean
  onCaptain: () => void
  onClose: () => void
  onRemove: () => void
  onRestore: () => void
  onSelectReplacement: () => void
  onSubstitute: () => void
  onViceCaptain: () => void
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
  const start = selectedIndex < 0 ? 0 : Math.max(0, Math.min(selectedIndex - 2, ordered.length - 6))

  return ordered.slice(start, start + 6).map((gameweek) => {
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

export function SquadActionDrawer({ mode, player, fixtures = [], gameweeks = [], pointsHistory = [], selectedGameweekNumber, removed, isStarter, isCaptain, isViceCaptain, onCaptain, onClose, onRemove, onRestore, onSelectReplacement, onSubstitute, onViceCaptain }: Props) {
  const photo = playerPhoto(player.photo)
  const upcoming = playerFixtures(player, fixtures, gameweeks, pointsHistory, selectedGameweekNumber)
  const firstName = player.first_name.trim()

  return <div className="fixed inset-0 z-50 bg-pl-purple/70 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside aria-label={`${player.web_name} actions`} aria-modal="true" className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col overflow-y-auto bg-[#f8f6f8] p-5 shadow-[-30px_0_80px_#1700194d] tablet:p-7" role="dialog">
      <button aria-label="Close player actions" className="ml-auto grid size-10 place-items-center rounded-full border-0 bg-white text-xl text-pl-purple shadow-sm" onClick={onClose} type="button">×</button>

      <div className="mt-5 overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#04f5ff,#8a46ff)] text-pl-purple">
        <div className="flex min-h-[170px] items-stretch gap-4 px-5 pt-4">
          <div className="grid w-[44%] shrink-0 place-items-end overflow-hidden">
            <DrawerPortrait key={photo ?? 'missing'} photo={photo} playerName={player.web_name} />
          </div>
          <div className="min-w-0 self-center pb-4">
            <p className="text-sm font-bold">{player.position.name}</p>
            {firstName && firstName.toLocaleLowerCase() !== player.web_name.toLocaleLowerCase() && <p className="mt-3 text-xl leading-none">{firstName}</p>}
            <h2 className="mt-1 break-words font-display text-4xl font-black leading-none">{player.web_name}</h2>
            <p className="mt-4 flex items-center gap-2 text-sm"><img alt="" className="size-6 object-contain" src={teamBadge(player.team.code)} />{player.team.name}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white px-5 py-4 shadow-sm">
        <span className="text-sm text-pl-purple">Price: <b>{price(player.stats.now_cost)}</b></span>
      </div>

      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl bg-white text-center shadow-sm">
        <div className="p-5"><span className="block text-[10px] text-muted underline decoration-dotted underline-offset-4">Form</span><b className="mt-1 block text-lg text-pl-purple">{player.stats.form}</b></div>
        <div className="border-x border-[#eee8ef] p-5"><span className="block text-[10px] text-muted">Pts / Match</span><b className="mt-1 block text-lg text-pl-purple">{player.stats.points_per_game}</b></div>
        <div className="p-5"><span className="block text-[10px] text-muted underline decoration-dotted underline-offset-4">Selected</span><b className="mt-1 block text-lg text-pl-purple">{player.stats.selected_by_percent}%</b></div>
      </div>

      {upcoming.length > 0 && <section aria-label="Player fixtures" className="mt-4 rounded-2xl bg-white px-4 py-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between px-1"><h3 className="text-sm font-black text-pl-purple">Form</h3><span className="text-sm font-black text-pl-purple">Fixtures</span></div>
        <div className="grid grid-cols-3 gap-2 tablet:grid-cols-6">
          {upcoming.map(({ gameweek, opponent, opponentLabel, difficulty, points }) => <div className="min-w-0 text-center" key={gameweek.id}>
            <span className="block text-[9px] text-muted">GW{gameweek.number}</span>
            <div className="mx-auto mt-2 grid size-10 place-items-center">{opponent ? <img alt={`${opponent.name} crest`} className="max-h-9 max-w-9 object-contain" src={teamBadge(opponent.code)} /> : <span className="text-lg text-[#c9c2cb]">—</span>}</div>
            <span className="mt-1 block truncate text-[9px] font-bold text-muted" title={opponentLabel}>{opponentLabel}</span>
            <span className={`mt-2 block rounded-md px-1 py-1 text-[10px] font-black ${points === null ? fixtureDifficultyClass(difficulty) : 'bg-[#f4f1f5] text-pl-purple'}`}>{points === null ? difficulty ?? '—' : `${points}pts`}</span>
          </div>)}
        </div>
      </section>}

      <div className="mt-auto pt-8">
        {mode === 'pick-team' && <>
          <div className="grid grid-cols-2 gap-3">
            <button aria-label={isCaptain ? 'Captain ✓' : 'Make captain'} aria-pressed={isCaptain} className="flex items-center gap-3 border-0 bg-transparent px-1 py-2 text-left text-sm text-muted disabled:opacity-45" disabled={!isStarter} onClick={onCaptain} type="button"><span aria-hidden="true" className={`grid size-6 place-items-center rounded-md border-2 ${isCaptain ? 'border-pl-purple bg-pl-purple text-white' : 'border-[#9f8da4] bg-white'}`}>{isCaptain ? '✓' : ''}</span>Captain</button>
            <button aria-label={isViceCaptain ? 'Vice captain ✓' : 'Make vice captain'} aria-pressed={isViceCaptain} className="flex items-center gap-3 border-0 bg-transparent px-1 py-2 text-left text-sm text-muted disabled:opacity-45" disabled={!isStarter} onClick={onViceCaptain} type="button"><span aria-hidden="true" className={`grid size-6 place-items-center rounded-md border-2 ${isViceCaptain ? 'border-pl-purple bg-pl-purple text-white' : 'border-[#9f8da4] bg-white'}`}>{isViceCaptain ? '✓' : ''}</span>Vice captain</button>
          </div>
          {!isStarter && <p className="mt-2 text-center text-[9px] text-muted">Only starting players can be captain or vice captain.</p>}
          <button className="mt-3 w-full rounded-xl bg-pl-purple px-4 py-3 text-xs font-bold text-white" onClick={onSubstitute} type="button">Substitute</button>
        </>}
        {mode === 'transfers' && <div className="grid grid-cols-2 gap-3">
          <button className="rounded-xl bg-pl-purple px-4 py-3 text-xs font-bold text-white" onClick={removed ? onRestore : onRemove} type="button">{removed ? 'Restore original' : 'Remove player'}</button>
          <button className="rounded-xl bg-pl-purple px-4 py-3 text-xs font-bold text-white" onClick={onSelectReplacement} type="button">Select replacement</button>
        </div>}
      </div>
    </aside>
  </div>
}
