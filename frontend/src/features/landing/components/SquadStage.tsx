const pitchPlayers = [
  { role: 'FWD', name: 'Haaland', points: '12', className: 'taste-forward' },
  { role: 'MID', name: 'Saka', points: '8', className: 'taste-mid-left' },
  { role: 'MID', name: 'Palmer', points: '10', className: 'taste-mid-right' },
  { role: 'DEF', name: 'Saliba', points: '6', className: 'taste-def-left' },
  { role: 'DEF', name: 'Gvardiol', points: '7', className: 'taste-def-right' },
]

export function SquadStage({ compact = false }: { compact?: boolean }) {
  return <div className={`squad-stage ${compact ? 'squad-stage-compact' : ''}`} aria-label="Example Fantasy PL squad">
    <div className="squad-toolbar"><div><span>MY SQUAD</span><strong>Weekend XI</strong></div><div className="gw-pill">GW 01 <b>43 pts</b></div></div>
    <div className="taste-pitch"><div className="taste-center-circle" />{pitchPlayers.map((player) => <div className={`taste-player ${player.className}`} key={player.name}><span>{player.role}</span><strong>{player.name}</strong><em>{player.points}</em></div>)}<div className="taste-player taste-keeper"><span>GKP</span><strong>Raya</strong><em>5</em></div></div>
    <div className="squad-meta"><span><i /> Team saved</span><span>£0.5m bank</span></div>
  </div>
}
