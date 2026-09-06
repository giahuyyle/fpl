import { useEffect, useState } from 'react'
import { searchPlayers, type PlayerSearchResponse } from '../squad/api/squadApi'
import { playerPhoto, teamBadge } from '../squad/squadConfig'
import type { LeagueData } from './leagueData'

const pageSize = 25
export function PlayersDirectory({ data }: { data: LeagueData }) {
  const [filters, setFilters] = useState({ query: '', team: '', position: '', page: 0 })
  const [result, setResult] = useState<PlayerSearchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      searchPlayers({ season_id: data.season.id, selectable_only: false, query: filters.query, team_ids: filters.team ? [Number(filters.team)] : [], position_ids: filters.position ? [Number(filters.position)] : [], sort_by: 'last_name', sort_direction: 'asc', offset: filters.page * pageSize, limit: pageSize })
        .then(value => { if (active) { setResult(value); setLoading(false) } })
        .catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : 'Unable to load players.'); setLoading(false) } })
    }, 200)
    return () => { active = false; window.clearTimeout(timer) }
  }, [data.season.id, filters, attempt])
  function change(next: Partial<typeof filters>) { setLoading(true); setError(''); setFilters(current => ({ ...current, page: 0, ...next })) }
  const pages = Math.max(1, Math.ceil((result?.total ?? 0) / pageSize))
  return <>
    <div className="league-filters">
      <input aria-label="Search players" type="search" placeholder="Search players" maxLength={100} value={filters.query} onChange={e => change({ query: e.target.value })} />
      <span className="season-label">{data.season.name}</span>
      <select aria-label="Club" value={filters.team} onChange={e => change({ team: e.target.value })}><option value="">All clubs</option>{data.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
      <select aria-label="Position" value={filters.position} onChange={e => change({ position: e.target.value })}><option value="">All positions</option>{data.positions.map(position => <option key={position.id} value={position.id}>{position.name}</option>)}</select>
      <button disabled={!filters.query && !filters.team && !filters.position} onClick={() => change({ query: '', team: '', position: '' })}>Reset</button>
    </div>
    <div className="directory-summary"><span>Player directory</span><span>Last name · A–Z</span></div>
    <section className="league-card" aria-label="Player directory" aria-busy={loading}>
      {error ? <div className="league-message" role="alert">{error}<button onClick={() => { setLoading(true); setError(''); setAttempt(n => n + 1) }}>Try again</button></div>
        : loading ? <p className="league-message" role="status">Loading players…</p>
        : !result?.items.length ? <div className="league-message"><h2>No players found</h2><p>Try a different name, club, or position.</p></div>
        : <div className="league-table-scroll"><table className="players-table"><thead><tr><th scope="col">Player</th><th scope="col">Club</th><th scope="col">Position</th></tr></thead><tbody>{result.items.map(player => {
          const photo = playerPhoto(player.photo)
          return <tr key={player.id}><td><div className="player-name">{photo && <img className="player-portrait" src={photo} alt="" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = teamBadge(player.team.code) }} />}<span><strong>{player.first_name} {player.last_name}</strong><small className="mobile-player-club">{player.team.name}</small></span></div></td><td><div className="club-name"><img src={teamBadge(player.team.code)} alt="" />{player.team.name}</div></td><td>{player.position.name}</td></tr>
        })}</tbody></table></div>}
    </section>
    <nav className="pagination" aria-label="Player pagination">
      <span aria-live="polite">{!loading && !error && result ? `${result.total ? filters.page * pageSize + 1 : 0}–${Math.min((filters.page + 1) * pageSize, result.total)} of ${result.total} players` : ' '}</span>
      <div><button disabled={loading || filters.page === 0} onClick={() => change({ page: filters.page - 1 })}>Previous</button><span>Page {filters.page + 1} of {pages}</span><button disabled={loading || !!error || filters.page + 1 >= pages} onClick={() => change({ page: filters.page + 1 })}>Next</button></div>
    </nav>
  </>
}
