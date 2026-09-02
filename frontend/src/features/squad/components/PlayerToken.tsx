import { useState } from 'react'
import { Icon } from '../../../shared/ui/Icon'
import type { Player } from '../api/squadApi'
import { playerPhoto, price, teamBadge } from '../squadConfig'

type Props = {
  player: Player
  compact?: boolean
  role?: 'C' | 'V'
}

function PlayerPortrait({ compact, photo }: { compact: boolean; photo: string | null }) {
  const [photoFailed, setPhotoFailed] = useState(!photo)

  return <div className={`relative mx-auto grid place-items-center overflow-hidden rounded-t-xl bg-[#f1eff2] ${compact ? 'h-[62px]' : 'h-[76px] tablet:h-[88px]'}`}>
    {!photoFailed && photo && <img
      alt=""
      className="mx-auto h-full max-w-full object-contain object-bottom drop-shadow-[0_6px_5px_#002c2055]"
      loading="lazy"
      onError={() => setPhotoFailed(true)}
      src={photo}
    />}
    {photoFailed && <span aria-label="Generic player portrait" className="grid size-12 place-items-center rounded-full bg-[#ddd8df] text-[#766a78]" role="img"><Icon name="user" size={compact ? 28 : 34} /></span>}
  </div>
}

export function PlayerToken({ player, compact = false, role }: Props) {
  const photo = playerPhoto(player.photo)

  return <div className={`group relative mx-auto w-full max-w-[112px] text-center ${compact ? 'max-w-[92px]' : ''}`}>
    {role && <span aria-label={role === 'C' ? 'Captain' : 'Vice captain'} className="absolute left-1 top-1 z-20 grid size-5 place-items-center rounded-full bg-pl-purple text-[8px] font-black text-white shadow-md">{role}</span>}
    <PlayerPortrait compact={compact} key={photo ?? 'missing-photo'} photo={photo} />
    <div className="relative z-10 overflow-hidden rounded-b-md bg-white shadow-[0_5px_13px_#16001830]">
      <span className="flex min-w-0 items-center justify-center gap-1 px-1 pt-1">
        <img alt={`${player.team.name} crest`} className="size-3.5 shrink-0 object-contain" loading="lazy" onError={(event) => { event.currentTarget.hidden = true }} src={teamBadge(player.team.code)} />
        <strong className="truncate font-display text-[10px] font-extrabold text-pl-purple tablet:text-[11px]">{player.web_name}</strong>
      </span>
      <span className="block truncate px-1 pb-1 text-[7px] font-semibold text-[#766a78] tablet:text-[8px]">{player.team.name}</span>
      <span className="block bg-pl-purple px-1 py-0.5 text-[8px] font-bold text-white">{price(player.stats.now_cost)}</span>
    </div>
  </div>
}
