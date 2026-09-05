import type { UserChipState } from '../api/squadApi'
import type { SquadMode } from './SquadPitch'
import { price } from '../squadConfig'

type Props = {
  budget: number
  chipUpdating?: boolean
  chips: UserChipState[]
  deadline: string | null
  mode: SquadMode
  pickCount: number
  onChipChange?: (chip: UserChipState) => void
  squadName?: string
  squadValue: number
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

export function SquadRouteHeader({ budget, chipUpdating = false, chips, deadline, mode, onChipChange, pickCount, squadName = 'Squad', squadValue }: Props) {
  const title = mode === 'pick-team' ? 'Pick Team' : mode === 'transfers' ? 'Transfers' : squadName
  const visibleChips = chips.flatMap((chip) => {
    const key = chipKey(chip)
    const definition = chipDefinitions.find((item) => item.key === key)
    return definition ? [{ ...definition, chip }] : []
  })

  return <section aria-label={`${title} summary`} className="mb-5 overflow-hidden rounded-[28px] bg-white shadow-sm">
    <div className={`flex flex-col gap-5 px-5 py-5 tablet:px-7 tablet:py-6 ${mode === 'transfers' ? 'wide:flex-row wide:items-center wide:justify-between' : ''}`}>
      <div>
        <h1 className="font-display text-3xl font-black tracking-[-.04em] text-pl-purple">{title}</h1>
        <p className="mt-2 text-sm font-bold text-muted">Deadline: {deadline ?? 'To be announced'}</p>
      </div>
      {mode === 'transfers' && <dl className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[#e7e0e8] bg-[#faf8fb] text-center">
        <div className="px-3 py-4"><dt className="text-[8px] font-black uppercase tracking-[.12em] text-muted">Players selected</dt><dd className="mt-1 font-display text-lg font-black text-pl-purple">{pickCount} / 15</dd></div>
        <div className="border-x border-[#e7e0e8] px-3 py-4"><dt className="text-[8px] font-black uppercase tracking-[.12em] text-muted">Budget</dt><dd className={`mt-1 font-display text-lg font-black ${budget < 0 ? 'text-pl-pink' : 'text-[#0b8f55]'}`}>{price(budget)}</dd></div>
        <div className="px-3 py-4"><dt className="text-[8px] font-black uppercase tracking-[.12em] text-muted">Squad value</dt><dd className="mt-1 font-display text-lg font-black text-pl-purple">{price(squadValue)}</dd></div>
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
        ['Average points', '0'],
        ['Highest points', '0'],
        ['Total points', '0'],
        ['GW rank', '0'],
        ['Transfers', '0'],
      ].map(([label, value]) => <div className="bg-white px-3 py-5 text-center" key={label}><dd className="font-display text-2xl font-black text-pl-purple">{value}</dd><dt className="mt-1 text-[9px] font-bold text-muted">{label}</dt></div>)}
    </dl>}
  </section>
}
