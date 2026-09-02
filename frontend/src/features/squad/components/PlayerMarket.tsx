import type { Player, Position, Team } from '../api/squadApi'
import { price, statOptions, teamBadge } from '../squadConfig'

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
  onAdd: (player: Player) => void
}

const inputClass = 'min-h-10 w-full rounded-xl border border-[#ddd5df] bg-[#faf9fb] px-3 text-xs text-pl-purple outline-none transition focus:border-pl-purple focus:bg-white focus:ring-2 focus:ring-pl-purple/10'

export function PlayerMarket({ filters, onFilters, players, total, loading, teams, selectedPosition, selectedIds, onAdd }: Props) {
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
      {!loading && players.map((player) => {
        const selected = selectedIds.has(player.id)
        return <button
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-0 border-b border-[#eee9ef] bg-white px-4 py-3 text-left transition hover:bg-[#f7fff9] focus-visible:relative focus-visible:z-10 tablet:px-5"
          disabled={selected}
          key={player.id}
          onClick={() => onAdd(player)}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-3">
            <img
              alt={`${player.team.name} crest`}
              className="h-10 w-10 shrink-0 object-contain"
              loading="lazy"
              onError={(event) => { event.currentTarget.hidden = true }}
              src={teamBadge(player.team.code)}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <b className="truncate font-display text-sm font-extrabold text-pl-purple">{player.web_name}</b>
                <small className="rounded bg-[#eee8ef] px-1.5 py-0.5 text-[8px] font-black text-pl-purple">{player.position.code}</small>
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted">{player.team.name}</span>
              <span className="mt-1 flex gap-3 text-[10px] text-muted"><span>Form <b className="text-pl-purple">{player.stats.form}</b></span><span>Pts <b className="text-pl-purple">{player.stats.total_points}</b></span></span>
            </span>
          </span>
          <span className="text-right"><b className="block text-xs text-pl-purple">{price(player.stats.now_cost)}</b><small className={`mt-1 block text-[9px] font-black uppercase tracking-[.1em] ${selected ? 'text-muted' : 'text-pl-pink'}`}>{selected ? 'Selected' : 'Add +'}</small></span>
        </button>
      })}
    </div>
  </aside>
}
