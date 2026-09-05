import { useState } from 'react'
import { Icon } from '../../../shared/ui/Icon'
import type { Player } from '../api/squadApi'
import { kitImage, price } from '../squadConfig'

type Props = {
  context: 'points' | 'opponent'
  gameweekPoints?: number
  opponent?: string
  player: Player
  showPrice?: boolean
  seasonName: string
  role?: 'C' | 'V'
}

function PlayerPortrait({ image }: { image: string | null }) {
  const [imageFailed, setImageFailed] = useState(!image)

  return <div className="relative mx-auto grid h-[76px] place-items-center overflow-hidden rounded-t-xl bg-[#f1eff2] tablet:h-[88px]">
    {!imageFailed && image && <img
      alt=""
      className="mx-auto h-[86%] w-[86%] self-end object-contain object-bottom drop-shadow-[0_6px_5px_#002c2055]"
      loading="lazy"
      onError={() => setImageFailed(true)}
      src={image}
    />}
    {imageFailed && <span aria-label="Generic player portrait" className="grid size-12 place-items-center rounded-full bg-[#ddd8df] text-[#766a78]" role="img"><Icon name="user" size={34} /></span>}
  </div>
}

export function PlayerToken({ context, gameweekPoints, opponent, player, showPrice = false, seasonName, role }: Props) {
  const image = kitImage(seasonName, player.team.code, player.position.code)

  return <div className="group relative mx-auto w-full max-w-[112px] text-center">
    {role && <span aria-label={role === 'C' ? 'Captain' : 'Vice captain'} className="absolute left-1 top-1 z-20 grid size-5 place-items-center rounded-full bg-pl-purple text-[8px] font-black text-white shadow-md">{role}</span>}
    {showPrice && <span className="absolute right-1 top-1 z-20 rounded-full bg-pl-purple px-2 py-1 text-[8px] font-black text-white shadow-md">{price(player.stats.now_cost)}</span>}
    <PlayerPortrait image={image} key={image ?? 'missing-kit'} />
    <div className="relative z-10 overflow-hidden rounded-b-md bg-white shadow-[0_5px_13px_#16001830]">
      <strong className="block truncate px-1 py-1 font-display text-[10px] font-extrabold text-pl-purple tablet:text-[11px]">{player.web_name}</strong>
      <span className={`block truncate border-t border-[#eee8ef] px-1 py-1 text-[8px] font-black tablet:text-[9px] ${context === 'points' ? 'bg-pl-purple text-white' : 'bg-[#fbf9fb] text-pl-purple'}`}>
        {context === 'points' ? `${gameweekPoints ?? 0} pts` : opponent ?? '—'}
      </span>
    </div>
  </div>
}
