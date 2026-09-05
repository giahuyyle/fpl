import type { ReactNode } from 'react'
import type { SquadPoints, UserChipState } from '../api/squadApi'
import type { SquadMode } from './SquadPitch'
import { Icon } from '../../../shared/ui/Icon'
import { price } from '../squadConfig'

type Props = {
  actions?: ReactNode
  budget: number
  chipUpdating?: boolean
  chips: UserChipState[]
  deadline: string | null
  freeTransfers?: number
  gameweekName?: string
  canGoNextGameweek?: boolean
  canGoPreviousGameweek?: boolean
  mode: SquadMode
  pickCount: number
  points?: SquadPoints
  onChipChange?: (chip: UserChipState) => void
  onNextGameweek?: () => void
  onPreviousGameweek?: () => void
  squadName?: string
  squadValue: number
  transferCost?: number
}

const chipDefinitions = [
  { key: 'bboost', label: 'Bench Boost', mark: 'B' },
  { key: '3xc', label: 'Triple Captain', mark: '3×' },
  { key: 'wildcard', label: 'Wildcard', mark: 'W' },
  { key: 'freehit', label: 'Free Hit', mark: 'F' },
]

function chipKey(chip: UserChipState) {
  const value = `${chip.name} ${chip.chip_type}`.toLowerCase().replaceAll(/[^a-z0-9]/g, '')
  if (value.includes('bboost') || value.includes('benchboost')) return 'bboost'
  if (value.includes('3xc') || value.includes('triplecaptain')) return '3xc'
  if (value.includes('wildcard')) return 'wildcard'
  if (value.includes('freehit')) return 'freehit'
  return null
}

export function SquadRouteHeader({ actions, budget, canGoNextGameweek = false, canGoPreviousGameweek = false, chipUpdating = false, chips, deadline, freeTransfers = 1, gameweekName, mode, onChipChange, onNextGameweek, onPreviousGameweek, pickCount, points, squadName = 'Squad', squadValue, transferCost = 0 }: Props) {
  const title = mode === 'pick-team' ? 'Pick Team' : mode === 'transfers' ? 'Transfers' : squadName
  const visibleChips = chips.flatMap((chip) => {
    const key = chipKey(chip)
    const definition = chipDefinitions.find((item) => item.key === key)
    return definition ? [{ ...definition, chip }] : []
  })

  return <section aria-label={`${title} summary`} className="mb-5 overflow-hidden rounded-[28px] bg-white shadow-sm">
    <div className={`flex flex-col gap-5 px-5 py-5 tablet:px-7 tablet:py-6 ${mode === 'transfers' ? 'wide:flex-row wide:items-center wide:justify-between' : ''}`}>
      {mode === 'view'
        ? <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3 tablet:grid-cols-[44px_minmax(0,1fr)_44px]">
          <button aria-label="Previous gameweek" className="grid size-10 place-items-center justify-self-start rounded-full bg-[#f0eaf1] text-pl-purple transition hover:bg-[#e6dce8] disabled:cursor-not-allowed disabled:opacity-30 tablet:size-11" disabled={!canGoPreviousGameweek} onClick={onPreviousGameweek} type="button"><span className="rotate-180"><Icon name="chevron" size={20} /></span></button>
          <div className="min-w-0 text-center">
            <h1 className="truncate font-display text-3xl font-black tracking-[-.04em] text-pl-purple">{title}</h1>
            <p className="mt-2 text-sm font-bold text-muted">{gameweekName ?? points?.gameweek.name ?? 'Gameweek'}</p>
          </div>
          <button aria-label="Next gameweek" className="grid size-10 place-items-center justify-self-end rounded-full bg-[#f0eaf1] text-pl-purple transition hover:bg-[#e6dce8] disabled:cursor-not-allowed disabled:opacity-30 tablet:size-11" disabled={!canGoNextGameweek} onClick={onNextGameweek} type="button"><Icon name="chevron" size={20} /></button>
        </div>
        : <div>
          <h1 className="font-display text-3xl font-black tracking-[-.04em] text-pl-purple">{title}</h1>
          <p className="mt-2 text-sm font-bold text-muted">Deadline: {deadline ?? 'To be announced'}</p>
        </div>}
      {mode === 'transfers' && <dl className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#e7e0e8] bg-[#e7e0e8] text-center tablet:grid-cols-5 wide:flex-1">
        <div className="grid min-w-0 grid-rows-[2rem_auto] place-items-center bg-[#faf8fb] px-3 py-4"><dt className="flex h-8 max-w-full items-center justify-center whitespace-normal text-center text-[8px] font-black uppercase leading-[1.35] tracking-[.12em] text-muted">Players selected</dt><dd className="mt-1 max-w-full self-start break-words font-display text-lg font-black text-pl-purple">{pickCount} / 15</dd></div>
        <div className="grid min-w-0 grid-rows-[2rem_auto] place-items-center bg-[#faf8fb] px-3 py-4"><dt className="flex h-8 max-w-full items-center justify-center whitespace-normal text-center text-[8px] font-black uppercase leading-[1.35] tracking-[.12em] text-muted">Budget</dt><dd className={`mt-1 max-w-full self-start break-words font-display text-lg font-black ${budget < 0 ? 'text-pl-pink' : 'text-[#0b8f55]'}`}>{price(budget)}</dd></div>
        <div className="grid min-w-0 grid-rows-[2rem_auto] place-items-center bg-[#faf8fb] px-3 py-4"><dt className="flex h-8 max-w-full items-center justify-center whitespace-normal text-center text-[8px] font-black uppercase leading-[1.35] tracking-[.12em] text-muted">Squad value</dt><dd className="mt-1 max-w-full self-start break-words font-display text-lg font-black text-pl-purple">{price(squadValue)}</dd></div>
        <div className="grid min-w-0 grid-rows-[2rem_auto] place-items-center bg-[#faf8fb] px-3 py-4"><dt className="flex h-8 max-w-full items-center justify-center whitespace-normal text-center text-[8px] font-black uppercase leading-[1.35] tracking-[.12em] text-muted">Free transfers</dt><dd className="mt-1 max-w-full self-start break-words font-display text-lg font-black text-pl-purple">{freeTransfers}</dd></div>
        <div className="grid min-w-0 grid-rows-[2rem_auto] place-items-center bg-[#faf8fb] px-3 py-4"><dt className="flex h-8 max-w-full items-center justify-center whitespace-normal text-center text-[8px] font-black uppercase leading-[1.35] tracking-[.12em] text-muted">Cost</dt><dd className={`mt-1 max-w-full self-start break-words font-display text-lg font-black ${transferCost > 0 ? 'text-pl-pink' : 'text-pl-purple'}`}>{transferCost} pts</dd></div>
      </dl>}
    </div>
    {mode === 'pick-team' && <div className="grid gap-px border-t border-[#e7e0e8] bg-[#e7e0e8] tablet:grid-cols-4">
      {visibleChips.map(({ chip, label, mark }) => {
        const status = chip.status[0].toUpperCase() + chip.status.slice(1)
        return <button aria-label={chip.status === 'active' ? `Cancel ${label}` : `Activate ${label}`} aria-pressed={chip.status === 'active'} className="bg-white px-4 py-5 text-center disabled:cursor-not-allowed" disabled={chipUpdating || chip.status === 'unavailable'} key={chip.id} onClick={() => onChipChange?.(chip)} type="button">
          <span className={`mx-auto grid size-10 place-items-center rounded-full font-display text-xs font-black ${status === 'Active' ? 'bg-pl-purple text-pl-green' : status === 'Available' ? 'bg-[#ddf8e7] text-[#05633d]' : 'bg-[#f0ecf1] text-muted'}`}>{mark}</span>
          <strong className="mt-2 block text-xs text-pl-purple">{label}</strong>
          <small className={`mt-1 block text-[9px] font-black uppercase tracking-[.08em] ${status === 'Active' ? 'text-pl-pink' : status === 'Available' ? 'text-[#0b8f55]' : 'text-muted'}`}>{status}</small>
        </button>
      })}
    </div>}
    {mode === 'view' && <dl className="grid grid-cols-2 gap-px border-t border-[#e7e0e8] bg-[#e7e0e8] tablet:grid-cols-5">
      {[
        ['Average points', String(points?.average_points ?? 0)],
        ['Highest points', String(points?.highest_points ?? 0)],
        ['Total points', String(points?.points ?? 0)],
        ['GW rank', points?.gameweek_rank?.toLocaleString() ?? '—'],
        ['Transfers', String(points?.transfers ?? 0)],
      ].map(([label, value]) => <div className="bg-white px-3 py-5 text-center" key={label}><dd className="font-display text-2xl font-black text-pl-purple">{value}</dd><dt className="mt-1 text-[9px] font-bold text-muted">{label}</dt></div>)}
    </dl>}
    {actions && <div aria-label={`${title} actions`} className="flex flex-wrap justify-end gap-2 border-t border-[#e7e0e8] px-5 py-4 tablet:px-7">{actions}</div>}
  </section>
}
