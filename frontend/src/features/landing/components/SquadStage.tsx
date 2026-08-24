const pitchPlayers = [
  { role: 'FWD', name: 'Haaland', points: '12', className: 'left-[calc(50%-27px)] top-7 tablet:top-10' },
  { role: 'MID', name: 'Saka', points: '8', className: 'left-[16%] top-[104px] tablet:top-[133px]' },
  { role: 'MID', name: 'Palmer', points: '10', className: 'right-[16%] top-[104px] tablet:top-[133px]' },
  { role: 'DEF', name: 'Saliba', points: '6', className: 'bottom-[75px] left-[22%]' },
  { role: 'DEF', name: 'Gvardiol', points: '7', className: 'bottom-[75px] right-[22%]' },
]

const shirtClass = 'mx-auto grid h-7 w-[31px] place-items-center bg-pl-green text-[5px] font-extrabold text-pl-purple [clip-path:polygon(18%_0,38%_8%,62%_8%,82%_0,100%_22%,84%_42%,84%_100%,16%_100%,16%_42%,0_22%)]'

export function SquadStage({ compact = false }: { compact?: boolean }) {
  return <div className={`relative overflow-hidden rounded-[3px] bg-white text-pl-purple shadow-[0_45px_90px_#16001899] ${compact ? 'absolute bottom-[-128px] right-1/2 w-[280px] translate-x-1/2 rotate-2 tablet:bottom-[-138px] tablet:right-[35px] tablet:w-80 tablet:translate-x-0' : ''}`} aria-label="Example Fantasy PL squad">
    <div className={`flex items-center justify-between px-[17px] ${compact ? 'h-[58px]' : 'h-[68px]'}`}><div className="flex flex-col"><span className="text-[7px] tracking-[.16em] text-[#806f82]">MY SQUAD</span><strong className="mt-[3px] font-display text-sm font-extrabold">Weekend XI</strong></div><div className="border border-[#ddd4df] px-2 py-1.5 text-[7px] tracking-[.08em]">GW 01 <b className="ml-2">43 pts</b></div></div>
    <div className={`relative mx-[9px] border border-white/20 bg-[#08754d] bg-[repeating-linear-gradient(90deg,#ffffff04_0_48px,#ffffff0b_48px_96px)] ${compact ? 'h-[310px]' : 'h-[285px] tablet:h-[370px]'}`}>
      <div className="absolute inset-3 border border-white/30" /><div className="absolute left-3 right-3 top-1/2 border-t border-white/30" /><div className="absolute left-[calc(50%-45px)] top-[calc(50%-45px)] size-[90px] rounded-full border border-white/30" />
      {pitchPlayers.map((player) => <div className={`absolute z-[2] w-[54px] text-center text-white ${player.className}`} key={player.name}><span className={shirtClass}>{player.role}</span><strong className="mt-[3px] block text-[8px]">{player.name}</strong><em className="absolute -right-px -top-[3px] grid size-[17px] place-items-center rounded-full bg-white text-[6px] font-extrabold not-italic text-pl-purple">{player.points}</em></div>)}
      <div className="absolute bottom-[18px] left-[calc(50%-27px)] z-[2] w-[54px] text-center text-white"><span className={`${shirtClass} bg-pl-cyan`}>GKP</span><strong className="mt-[3px] block text-[8px]">Raya</strong><em className="absolute -right-px -top-[3px] grid size-[17px] place-items-center rounded-full bg-white text-[6px] font-extrabold not-italic text-pl-purple">5</em></div>
    </div>
    <div className="flex h-10 items-center justify-between px-[17px] text-[7px] text-[#7a6e7c]"><span><i className="mr-[5px] inline-block size-1.5 rounded-full bg-pl-green" /> Team saved</span><span>£0.5m bank</span></div>
  </div>
}
