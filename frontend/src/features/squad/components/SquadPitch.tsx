import type { Player, Position } from '../api/squadApi'
import { positionOrder } from '../squadConfig'
import { PlayerToken } from './PlayerToken'

export type SquadMode = 'view' | 'pick-team' | 'transfers'

type PickMap = Record<number, Player | undefined>

type Props = {
  gameweekPlayed?: Record<number, boolean>
  gameweekPoints?: Record<number, number>
  opponents?: Record<number, string>
  picks: PickMap
  positions: Position[]
  seasonName: string
  mode: SquadMode
  lineupOrder: number[]
  captainSlot: number | null
  viceCaptainSlot: number | null
  selectedSlot: number | null
  substituteFromSlot: number | null
  onPlayerClick: (slot: number) => void
  onEmptySlot: (slot: number) => void
}

function EmptySlot({ code, selected }: { code: string; selected: boolean }) {
  return <div className={`mx-auto grid h-[106px] w-full max-w-[112px] place-items-center rounded-xl border-2 border-dashed px-2 text-center transition-all tablet:h-[122px] ${selected ? 'border-white bg-white/20 shadow-[0_8px_24px_#002c2040]' : 'border-white/50 bg-[#003c2b55] hover:border-white hover:bg-[#ffffff16]'}`}>
    <span><b className="block font-display text-2xl font-black text-white">+</b><small className="text-[8px] font-bold uppercase tracking-[.12em] text-white/80">Add {code}</small></span>
  </div>
}

function PitchMarkings() {
  return <div className="pointer-events-none absolute inset-3 rounded-sm border-2 border-white/40" aria-hidden="true">
    <div className="absolute inset-x-0 top-1/2 border-t-2 border-white/40" />
    <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
    <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
    <div className="absolute left-1/2 top-0 h-12 w-28 -translate-x-1/2 border-x-2 border-b-2 border-white/40" />
    <div className="absolute bottom-0 left-1/2 h-12 w-28 -translate-x-1/2 border-x-2 border-t-2 border-white/40" />
  </div>
}

function roleFor(slot: number, captainSlot: number | null, viceCaptainSlot: number | null) {
  if (slot === captainSlot) return 'C' as const
  if (slot === viceCaptainSlot) return 'V' as const
  return undefined
}

function PlayerCard({ captainSlot, clickable, gameweekPlayed, gameweekPoints, mode, opponent, pending, player, seasonName, slot, viceCaptainSlot, onClick }: {
  captainSlot: number | null
  clickable: boolean
  gameweekPlayed?: boolean
  gameweekPoints?: number
  mode: SquadMode
  opponent?: string
  pending: boolean
  player: Player
  seasonName: string
  slot: number
  viceCaptainSlot: number | null
  onClick: (slot: number) => void
}) {
  const token = <PlayerToken context={mode === 'view' && gameweekPlayed ? 'points' : 'opponent'} gameweekPoints={gameweekPoints} opponent={opponent} player={player} role={roleFor(slot, captainSlot, viceCaptainSlot)} seasonName={seasonName} showPrice={mode === 'transfers'} />
  if (!clickable) return token
  return <div className="relative mx-auto w-full max-w-[112px] min-w-0">
    {pending && <span className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-pl-pink px-2 py-1 text-[7px] font-black uppercase tracking-[.08em] text-white shadow-md">Swap</span>}
    <button aria-label={`Open actions for ${player.web_name}`} className="block w-full rounded-xl border-0 bg-transparent p-0" onClick={() => onClick(slot)} type="button">{token}</button>
  </div>
}

export function SquadPitch({ picks, positions, seasonName, mode, lineupOrder, captainSlot, viceCaptainSlot, selectedSlot, substituteFromSlot, gameweekPlayed, gameweekPoints, opponents, onPlayerClick, onEmptySlot }: Props) {
  const sortedPositions = [...positions].sort(
    (a, b) => positionOrder.indexOf(a.code) - positionOrder.indexOf(b.code),
  )

  if (mode === 'transfers') {
    let nextSlot = 1
    const rows = sortedPositions.map((position) => {
      const slots = Array.from({ length: position.squad_select }, () => nextSlot++)
      return { position, slots }
    })
    return <section aria-label="Select all 15 squad players" className="relative overflow-hidden rounded-[28px] bg-[#038653] p-4 shadow-[0_30px_80px_#17001933] tablet:p-6">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#ffffff00_0_70px,#ffffff08_70px_140px)]" aria-hidden="true" />
      <PitchMarkings />
      <div className="relative z-10 grid gap-5 py-3 tablet:gap-6">
        {rows.map(({ position, slots }) => <div key={position.code}>
          <p className="mb-2 text-center text-[9px] font-black uppercase tracking-[.16em] text-white/70">{position.name}s · {slots.length}</p>
          <div className={`mx-auto grid items-end justify-center gap-2 tablet:gap-3 ${slots.length === 2 ? 'max-w-[260px] grid-cols-2' : slots.length === 3 ? 'max-w-[390px] grid-cols-3' : 'max-w-[650px] grid-cols-5'}`}>
            {slots.map((slot) => picks[slot]
              ? <PlayerCard captainSlot={captainSlot} clickable key={slot} mode={mode} onClick={onPlayerClick} opponent={opponents?.[picks[slot].team.id]} pending={false} player={picks[slot]} seasonName={seasonName} slot={slot} viceCaptainSlot={viceCaptainSlot} />
              : <button aria-label={`Select empty ${position.code} slot ${slot}`} aria-pressed={selectedSlot === slot} className="min-w-0 rounded-xl border-0 bg-transparent p-0" key={slot} onClick={() => onEmptySlot(slot)} type="button"><EmptySlot code={position.code} selected={selectedSlot === slot} /></button>)}
          </div>
        </div>)}
      </div>
    </section>
  }

  const ordered = lineupOrder.flatMap((slot) => picks[slot] ? [{ slot, player: picks[slot] }] : [])
  const starters = ordered.slice(0, 11)
  const bench = ordered.slice(11, 15)
  const clickable = mode === 'pick-team'

  return <section aria-label={clickable ? 'Edit starting XI and substitutes' : 'Saved starting squad'} className="overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_#17001924]">
    <div className="relative min-h-[690px] bg-[#039b58] bg-[repeating-linear-gradient(90deg,#ffffff00_0_86px,#ffffff09_86px_172px)] px-3 py-7 tablet:min-h-[760px] tablet:px-6">
      <PitchMarkings />
      <div className="relative z-10 flex min-h-[630px] flex-col justify-around tablet:min-h-[700px]">
        {positionOrder.map((code) => <div className="flex items-end justify-center gap-2 tablet:gap-5" key={code}>
          {starters.filter(({ player }) => player.position.code === code).map(({ player, slot }) => <PlayerCard captainSlot={captainSlot} clickable={clickable} gameweekPlayed={gameweekPlayed?.[player.id]} gameweekPoints={mode === 'view' ? gameweekPoints?.[player.id] : undefined} key={slot} mode={mode} onClick={onPlayerClick} opponent={opponents?.[player.team.id]} pending={substituteFromSlot === slot} player={player} seasonName={seasonName} slot={slot} viceCaptainSlot={viceCaptainSlot} />)}
        </div>)}
      </div>
    </div>
    <div className="border-t-4 border-pl-purple bg-[#d9f5e5] px-3 py-5 tablet:px-6">
      <p className="mb-4 text-center text-[9px] font-black uppercase tracking-[.18em] text-pl-purple">Substitutes</p>
      <div className="mx-auto grid max-w-[520px] grid-cols-4 items-end gap-2 tablet:gap-4">
        {bench.map(({ player, slot }) => <PlayerCard captainSlot={captainSlot} clickable={clickable} gameweekPlayed={gameweekPlayed?.[player.id]} gameweekPoints={mode === 'view' ? gameweekPoints?.[player.id] : undefined} key={slot} mode={mode} onClick={onPlayerClick} opponent={opponents?.[player.team.id]} pending={substituteFromSlot === slot} player={player} seasonName={seasonName} slot={slot} viceCaptainSlot={viceCaptainSlot} />)}
      </div>
    </div>
  </section>
}
