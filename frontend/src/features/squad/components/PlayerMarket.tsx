import { useState } from 'react'
import type { Player, Position, Team } from '../api/squadApi'
import { kitImage, price, statOptions, teamBadge } from '../squadConfig'
import './PlayerMarket.css'

export type MarketFilters = {
  query: string
  teamId: string
  minPrice: string
  maxPrice: string
  minForm: string
  statField: string
  statMin: string
  statMax: string
  sortBy: string
}

type Props = {
  filters: MarketFilters
  onFilters: (filters: MarketFilters) => void
  players: Player[]
  total: number
  loading: boolean
  teams: Team[]
  selectedPosition?: Position
  selectedIds: Set<number>
  seasonName: string
  onAdd: (player: Player) => void
  onInfo: (player: Player) => void
}

const inputClass = 'min-h-10 w-full rounded-xl border border-[#ddd5df] bg-[#faf9fb] px-3 text-xs text-pl-purple outline-none transition focus:border-pl-purple focus:bg-white focus:ring-2 focus:ring-pl-purple/10'

function MarketKit({ player, seasonName }: { player: Player; seasonName: string }) {
  const [fallback, setFallback] = useState(false)
  const kit = kitImage(seasonName, player.team.code, player.position.code)

  return <img
    alt={`${player.team.name} ${fallback || !kit ? 'crest' : 'kit'}`}
    className="player-market-kit"
    loading="lazy"
    onError={() => setFallback(true)}
    src={fallback || !kit ? teamBadge(player.team.code) : kit}
  />
}

export function PlayerMarket({ filters, onFilters, players, total, loading, teams, selectedPosition, selectedIds, seasonName, onAdd, onInfo }: Props) {
  function set<K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) {
    onFilters({ ...filters, [key]: value })
  }

  return <aside className="scroll-mt-4 overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_#1700191c] wide:absolute wide:inset-0 wide:flex wide:min-h-0 wide:flex-col" aria-label="Player search" id="player-market">
    <div className="bg-pl-purple px-5 py-5 text-white tablet:px-6">
      <p className="text-[9px] font-black uppercase tracking-[.18em] text-pl-green">Player market</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-extrabold tracking-[-.035em]">Fill {selectedPosition?.code ?? 'a'} slot</h2>
        <span className="shrink-0 text-[10px] text-white/65">{total} found</span>
      </div>
    </div>
    <div className="grid gap-3 border-b border-[#e5dfe7] p-4 tablet:grid-cols-2 tablet:p-5">
      <label className="tablet:col-span-2"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.12em] text-[#766a78]">Search player</span><input aria-label="Search player" className={inputClass} onChange={(event) => set('query', event.target.value)} placeholder="Name or known name" type="search" value={filters.query} /></label>
      <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.12em] text-[#766a78]">Club</span><select aria-label="Club" className={inputClass} onChange={(event) => set('teamId', event.target.value)} value={filters.teamId}><option value="">All clubs</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.12em] text-[#766a78]">Sort by</span><select aria-label="Sort players by" className={inputClass} onChange={(event) => set('sortBy', event.target.value)} value={filters.sortBy}>{statOptions.map((option) => <option key={option.field} value={option.field}>{option.label}</option>)}</select></label>
      <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.12em] text-[#766a78]">Min price</span><input aria-label="Minimum price" className={inputClass} min="0" onChange={(event) => set('minPrice', event.target.value)} placeholder="£0.0" step="0.1" type="number" value={filters.minPrice} /></label>
      <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.12em] text-[#766a78]">Max price</span><input aria-label="Maximum price" className={inputClass} min="0" onChange={(event) => set('maxPrice', event.target.value)} placeholder="£15.0" step="0.1" type="number" value={filters.maxPrice} /></label>
      <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.12em] text-[#766a78]">Minimum form</span><input aria-label="Minimum form" className={inputClass} min="0" onChange={(event) => set('minForm', event.target.value)} placeholder="0.0" step="0.1" type="number" value={filters.minForm} /></label>
      <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.12em] text-[#766a78]">Advanced statistic</span><select aria-label="Advanced statistic" className={inputClass} onChange={(event) => set('statField', event.target.value)} value={filters.statField}><option value="">Choose a stat</option>{statOptions.filter(({ field }) => !['now_cost', 'form'].includes(field)).map((option) => <option key={option.field} value={option.field}>{option.label}</option>)}</select></label>
      {filters.statField && <><label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.12em] text-[#766a78]">Stat minimum</span><input aria-label="Statistic minimum" className={inputClass} onChange={(event) => set('statMin', event.target.value)} type="number" value={filters.statMin} /></label><label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.12em] text-[#766a78]">Stat maximum</span><input aria-label="Statistic maximum" className={inputClass} onChange={(event) => set('statMax', event.target.value)} type="number" value={filters.statMax} /></label></>}
    </div>
    <div className="max-h-[720px] overflow-auto wide:min-h-0 wide:max-h-none wide:flex-1" aria-busy={loading}>
      {loading && <p className="p-6 text-center text-xs text-muted" role="status">Searching players…</p>}
      {!loading && players.length === 0 && <p className="p-8 text-center text-sm text-muted">No players match these filters.</p>}
      {!loading && players.length > 0 && <div className="player-market-columns" aria-hidden="true">
        <strong>{selectedPosition ? `${selectedPosition.name}${selectedPosition.name.endsWith('s') ? '' : 's'}` : 'Players'}</strong>
        <span>Price</span>
        <abbr title="Total points">TP</abbr>
        <span>Add</span>
      </div>}
      {!loading && players.map((player) => {
        const selected = selectedIds.has(player.id)
        return <div className="player-market-row" key={player.id}>
          <button className="player-market-info-button" aria-label={`View ${player.web_name} details`} onClick={() => onInfo(player)} type="button"><span aria-hidden="true">i</span></button>
          <MarketKit player={player} seasonName={seasonName} />
          <span className="player-market-identity">
            <b>{player.web_name}</b>
            <span>{player.team.short_name} <small>{player.position.code}</small></span>
            <span className="player-market-form">Form {player.stats.form}</span>
          </span>
          <strong className="player-market-price"><span className="sr-only">Price </span>{price(player.stats.now_cost)}</strong>
          <strong className="player-market-points"><span className="sr-only">Total points </span>{player.stats.total_points}</strong>
          <button
            aria-label={selected ? `${player.web_name} already selected` : `Add ${player.web_name}`}
            className="player-market-add-button"
            disabled={selected}
            onClick={() => onAdd(player)}
            type="button"
          ><span aria-hidden="true">{selected ? '✓' : '+'}</span></button>
        </div>
      })}
    </div>
  </aside>
}
