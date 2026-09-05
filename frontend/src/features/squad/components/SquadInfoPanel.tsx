import { Icon } from '../../../shared/ui/Icon'
import type { BadgeStyle, Team } from '../api/squadApi'
import { price } from '../squadConfig'
import { teamBadge } from '../squadConfig'
import { SquadBadge } from './SquadBadge'

type Props = {
  badgeStyle: BadgeStyle
  bank: number
  favoriteTeams: Team[]
  onEdit: () => void
  squadName: string
  squadValue: number
  username: string
}

export function SquadInfoPanel({ badgeStyle, bank, favoriteTeams, onEdit, squadName, squadValue, username }: Props) {
  return <aside aria-label="Squad information" className="overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_#1700191c] wide:absolute wide:inset-0 wide:overflow-auto">
    <div className="flex items-center gap-4 border-b border-[#e9e3ea] px-5 py-6 tablet:px-7">
      <SquadBadge className="size-24 shrink-0" name={squadName} style={badgeStyle} />
      <div className="min-w-0">
        <h2 className="truncate font-display text-3xl font-black tracking-[-.04em] text-pl-purple">{squadName}</h2>
        <p className="mt-1 truncate text-sm font-semibold text-muted">{username}</p>
      </div>
    </div>

    <section className="border-b border-[#e9e3ea] px-5 py-7 tablet:px-7">
      <div className="flex items-center justify-between gap-3"><h3 className="font-display text-xl font-extrabold text-pl-purple">Team badge</h3><button className="rounded-full bg-[#f0eaf1] px-4 py-2 text-xs font-bold text-pl-purple" onClick={onEdit} type="button">Edit details</button></div>
      <div className="mt-5"><SquadBadge className="size-28" name={squadName} style={badgeStyle} /></div>
    </section>

    <section className="border-b border-[#e9e3ea] px-5 py-7 tablet:px-7">
      <h3 className="font-display text-xl font-extrabold text-pl-purple">Fan league</h3>
      {favoriteTeams.length
        ? <div className="mt-5 grid gap-2">{favoriteTeams.map((team) => <div className="flex items-center gap-3 rounded-2xl bg-[#f7f4f8] px-4 py-3" key={team.id}><img alt={`${team.name} crest`} className="size-11 object-contain" src={teamBadge(team.code)} /><strong className="text-sm text-pl-purple">{team.name}</strong></div>)}</div>
        : <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#f7f4f8] px-4 py-4 text-muted"><span className="grid size-11 place-items-center rounded-full bg-white text-pl-purple"><Icon name="users" size={22} /></span><strong className="text-sm">No favorite club</strong></div>}
    </section>

    <section className="px-5 py-7 tablet:px-7">
      <h3 className="font-display text-xl font-extrabold text-pl-purple">Finance</h3>
      <dl className="mt-5 grid gap-4 text-sm">
        <div className="flex items-center justify-between gap-4"><dt className="text-muted">Squad value</dt><dd className="font-display text-lg font-extrabold text-pl-purple">{price(squadValue)}</dd></div>
        <div className="flex items-center justify-between gap-4"><dt className="text-muted">In the bank</dt><dd className="font-display text-lg font-extrabold text-pl-purple">{price(bank)}</dd></div>
      </dl>
    </section>
  </aside>
}
