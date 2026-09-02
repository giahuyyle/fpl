import { useState } from 'react'
import { Icon } from '../../../shared/ui/Icon'
import type { Player } from '../api/squadApi'
import { playerPhoto, price, teamBadge } from '../squadConfig'
import type { SquadMode } from './SquadPitch'

type Props = {
  mode: Exclude<SquadMode, 'view'>
  player: Player
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

function DrawerPortrait({ photo }: { photo: string | null }) {
  const [failed, setFailed] = useState(false)

  if (!photo || failed) {
    return <span className="mb-5 grid size-14 place-items-center rounded-full bg-white/45 text-pl-purple" aria-label="Generic player portrait" role="img"><Icon name="user" size={36} /></span>
  }

  return <img alt="" className="h-full w-full object-contain object-bottom" onError={() => setFailed(true)} src={photo} />
}

export function SquadActionDrawer({ mode, player, removed, isStarter, isCaptain, isViceCaptain, onCaptain, onClose, onRemove, onRestore, onSelectReplacement, onSubstitute, onViceCaptain }: Props) {
  const photo = playerPhoto(player.photo)
  return <div className="fixed inset-0 z-50 bg-pl-purple/70 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside aria-label={`${player.web_name} actions`} aria-modal="true" className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col overflow-y-auto bg-[#f8f6f8] p-5 shadow-[-30px_0_80px_#1700194d] tablet:p-7" role="dialog">
      <button aria-label="Close player actions" className="ml-auto grid size-10 place-items-center rounded-full border-0 bg-white text-xl text-pl-purple shadow-sm" onClick={onClose} type="button">×</button>
      <div className="mt-5 overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#04f5ff,#8a46ff)] p-5 text-pl-purple">
        <div className="flex items-center gap-4">
          <div className="grid size-24 shrink-0 place-items-end overflow-hidden rounded-2xl bg-white/30">
            <DrawerPortrait key={photo ?? 'missing'} photo={photo} />
          </div>
          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.14em]">{player.position.name}</p><h2 className="mt-1 truncate font-display text-3xl font-black">{player.web_name}</h2><p className="mt-2 flex items-center gap-2 text-xs font-bold"><img alt="" className="size-5 object-contain" src={teamBadge(player.team.code)} />{player.team.name}</p></div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl bg-white text-center shadow-sm">
        <div className="p-4"><span className="block text-[8px] uppercase tracking-[.12em] text-muted">Price</span><b className="mt-1 block text-sm text-pl-purple">{price(player.stats.now_cost)}</b></div>
        <div className="border-x border-[#eee8ef] p-4"><span className="block text-[8px] uppercase tracking-[.12em] text-muted">Form</span><b className="mt-1 block text-sm text-pl-purple">{player.stats.form}</b></div>
        <div className="p-4"><span className="block text-[8px] uppercase tracking-[.12em] text-muted">Points</span><b className="mt-1 block text-sm text-pl-purple">{player.stats.total_points}</b></div>
      </div>

      <div className="mt-auto pt-8">
        {mode === 'pick-team' && <>
          <div className="grid grid-cols-2 gap-3">
            <button aria-pressed={isCaptain} className={`rounded-xl border px-3 py-3 text-xs font-bold ${isCaptain ? 'border-pl-purple bg-pl-purple text-white' : 'border-[#d8d0da] bg-white text-pl-purple'} disabled:opacity-45`} disabled={!isStarter} onClick={onCaptain} type="button">{isCaptain ? 'Captain ✓' : 'Make captain'}</button>
            <button aria-pressed={isViceCaptain} className={`rounded-xl border px-3 py-3 text-xs font-bold ${isViceCaptain ? 'border-pl-purple bg-pl-purple text-white' : 'border-[#d8d0da] bg-white text-pl-purple'} disabled:opacity-45`} disabled={!isStarter} onClick={onViceCaptain} type="button">{isViceCaptain ? 'Vice captain ✓' : 'Make vice captain'}</button>
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
