import { useState } from 'react'
import type { BadgeStyle, Squad, SquadProfilePayload, Team } from '../api/squadApi'
import { teamBadge } from '../squadConfig'
import { SquadBadge } from './SquadBadge'

const badgeStyles: Array<{ id: BadgeStyle; label: string }> = [
  { id: 'classic-purple', label: 'Classic' },
  { id: 'pink-purple', label: 'Pink' },
  { id: 'cyan-purple', label: 'Cyan' },
  { id: 'green-navy', label: 'Green' },
]

type Props = {
  onClose: () => void
  onSave: (profile: SquadProfilePayload) => Promise<void>
  open: boolean
  saving: boolean
  squad: Squad | null
  teams: Team[]
}

export function SquadProfileDialog({ onClose, onSave, open, saving, squad, teams }: Props) {
  const [name, setName] = useState(squad?.name ?? 'Squad')
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>(squad?.badge_style ?? 'classic-purple')
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<number[]>(
    squad?.favorite_teams.map((team) => team.id) ?? [],
  )

  if (!open) return null

  function toggleTeam(teamId: number) {
    setFavoriteTeamIds((current) => current.includes(teamId)
      ? current.filter((id) => id !== teamId)
      : current.length < 3 ? [...current, teamId] : current)
  }

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#210025]/75 px-4 py-8" role="presentation">
    <section aria-labelledby="squad-profile-title" aria-modal="true" className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl tablet:p-8" role="dialog">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-pl-pink">Squad profile</p><h2 className="mt-1 font-display text-3xl font-black text-pl-purple" id="squad-profile-title">{squad ? 'Edit squad' : 'Create your squad'}</h2></div>
        {squad && <button aria-label="Close squad profile" className="grid size-10 place-items-center rounded-full bg-[#f3eff4] font-bold text-pl-purple" onClick={onClose} type="button">×</button>}
      </div>

      <form className="mt-7 grid gap-7" onSubmit={(event) => { event.preventDefault(); void onSave({ name: name.trim(), badge_style: badgeStyle, favorite_team_ids: favoriteTeamIds }) }}>
        <label className="grid gap-2 text-xs font-black uppercase tracking-[.12em] text-muted" htmlFor="squad-name">Squad name<input className="rounded-xl border border-[#d8cfd9] px-4 py-3 text-base font-semibold normal-case tracking-normal text-pl-purple outline-none focus:border-pl-purple" id="squad-name" maxLength={50} onChange={(event) => setName(event.target.value)} required value={name} /></label>

        <fieldset><legend className="text-xs font-black uppercase tracking-[.12em] text-muted">Team badge</legend><div className="mt-3 grid grid-cols-2 gap-3 tablet:grid-cols-4">{badgeStyles.map((option) => <label className={`grid cursor-pointer place-items-center gap-2 rounded-2xl border p-3 ${badgeStyle === option.id ? 'border-pl-purple bg-[#f6f1f7]' : 'border-[#e5dfe6]'}`} key={option.id}><input aria-label={option.label} checked={badgeStyle === option.id} className="sr-only" name="badge-style" onChange={() => setBadgeStyle(option.id)} type="radio" value={option.id} /><SquadBadge className="size-16" name={name} style={option.id} /><span className="text-xs font-bold text-pl-purple">{option.label}</span></label>)}</div></fieldset>

        <fieldset><legend className="text-xs font-black uppercase tracking-[.12em] text-muted">Favorite clubs · {favoriteTeamIds.length}/3</legend><div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 tablet:grid-cols-3">{teams.map((team) => { const selected = favoriteTeamIds.includes(team.id); const disabled = !selected && favoriteTeamIds.length >= 3; return <label className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${selected ? 'border-pl-purple bg-[#f6f1f7]' : 'border-[#e5dfe6]'} ${disabled ? 'opacity-45' : 'cursor-pointer'}`} key={team.id}><input checked={selected} disabled={disabled} onChange={() => toggleTeam(team.id)} type="checkbox" /><img alt="" className="size-8 object-contain" src={teamBadge(team.code)} /><span className="truncate text-xs font-bold text-pl-purple">{team.name}</span></label> })}</div></fieldset>

        <button className="rounded-full bg-pl-pink px-6 py-3 text-sm font-black text-white disabled:opacity-50" disabled={saving || !name.trim()} type="submit">{saving ? 'Saving…' : squad ? 'Save details' : 'Create squad'}</button>
      </form>
    </section>
  </div>
}
