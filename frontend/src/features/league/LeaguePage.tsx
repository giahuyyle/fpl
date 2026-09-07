import { useEffect, useState } from 'react'
import { SiteHeader } from '../../shared/ui/SiteHeader'
import { AccountMenu } from '../auth/components/AccountMenu'
import { Icon } from '../../shared/ui/Icon'
import { FixturesPanel } from '../squad/components/FixturesPanel'
import { teamBadge } from '../squad/squadConfig'
import { loadLeagueData, standings, type LeagueData } from './leagueData'
import { PlayersDirectory } from './PlayersDirectory'
import './league.css'

type Section = 'matches' | 'table' | 'players'
export function LeaguePage({ section }: { section: Section }) {
  const [data, setData] = useState<LeagueData | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    loadLeagueData().then(value => { if (active) setData(value) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load league data.') })
    return () => { active = false }
  }, [attempt])
  const title = section === 'matches' ? `Premier League Matches${data ? ` ${data.season.name}` : ''}` : section === 'table' ? 'Table' : 'Players'
  return <div className="league-page"><SiteHeader actions={<AccountMenu />} /><main>
    <section className="league-hero"><div className="league-container"><p>Premier League</p><h1>{title}</h1></div></section>
    <div className="league-container league-content">
      {error ? <div className="league-card league-message" role="alert"><h2>Unable to load this page</h2><p>{error}</p><button onClick={() => { setError(''); setAttempt(n => n + 1) }}>Try again</button></div> : !data ? <p className="league-card league-message" role="status">Loading {section}…</p> : section === 'players' ? <PlayersDirectory data={data} /> : section === 'matches' ? <Matches data={data} /> : <LeagueTable data={data} />}
    </div>
  </main></div>
}

function Matches({ data }: { data: LeagueData }) {
  const [week, setWeek] = useState<number>(() => (data.gameweeks.find(w => !w.finished) ?? data.gameweeks.at(-1))?.number ?? 1)
  const [club, setClub] = useState('')
  return <><div className="league-filters"><span className="season-label">{data.season.name}</span><select aria-label="Matchweek" value={week} onChange={e => setWeek(Number(e.target.value))}>{data.gameweeks.map(w => <option key={w.id} value={w.number}>Matchweek {w.number}</option>)}</select><select aria-label="Club" value={club} onChange={e => setClub(e.target.value)}><option value="">All clubs</option>{data.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select><button disabled={!club} onClick={() => setClub('')}>Reset</button></div><div className="league-matches"><FixturesPanel fixtures={data.fixtures.filter(f => !club || f.home_team.id === Number(club) || f.away_team.id === Number(club))} gameweeks={data.gameweeks} selectedGameweekNumber={week} onGameweekChange={setWeek} /></div></>
}

function LeagueTable({ data }: { data: LeagueData }) {
  const [venue, setVenue] = useState('all')
  const [week, setWeek] = useState('')
  const fixtures = data.fixtures.filter(f => !week || data.gameweeks.some(w => w.id === f.gameweek_id && w.number <= Number(week)))
  const rows = standings(data.teams, fixtures, venue)
  return <><div className="league-filters"><span className="season-label">{data.season.name}</span><select aria-label="Through matchweek" value={week} onChange={e => setWeek(e.target.value)}><option value="">All matchweeks</option>{data.gameweeks.map(w => <option key={w.id} value={w.number}>Through matchweek {w.number}</option>)}</select><select aria-label="Home and away" value={venue} onChange={e => setVenue(e.target.value)}><option value="all">Home & Away</option><option value="home">Home</option><option value="away">Away</option></select><button disabled={!week && venue === 'all'} onClick={() => { setWeek(''); setVenue('all') }}>Reset</button></div>
    <section className="league-card league-table-scroll" aria-label="League table"><table className="standings-table"><thead><tr>{['Pos', 'Team', 'Pl', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts', 'Form', 'Next'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, index) => {
      const next = data.fixtures.filter(f => !f.finished && !f.finished_provisional && (f.home_team.id === row.team.id || f.away_team.id === row.team.id)).sort((a, b) => (a.kickoff_time ?? 'z').localeCompare(b.kickoff_time ?? 'z'))[0]
      const opponent = next && (next.home_team.id === row.team.id ? next.away_team : next.home_team)
      return <tr key={row.team.id}><td><strong>{index + 1}</strong></td><th scope="row"><div className="club-name"><img src={teamBadge(row.team.code)} alt="" />{row.team.name}</div></th>{[row.played, row.won, row.drawn, row.lost, row.gf, row.ga, row.gd].map((value, i) => <td key={i}>{value}</td>)}<td><strong>{row.points}</strong></td><td><div className="form">{row.form.slice(-5).map((f, i) => <span key={i} className={`form-${f}`} aria-label={f === 'W' ? 'Win' : f === 'D' ? 'Draw' : 'Loss'}>{f}</span>)}</div></td><td>{opponent ? <img className="next-club" src={teamBadge(opponent.code)} alt={opponent.name} title={opponent.name} /> : <Icon name="ball" size={18} />}</td></tr>
    })}</tbody></table>{!rows.length && <p className="league-message">No teams available for this season.</p>}</section><p className="table-note">Calculated from completed matches. Points deductions and competition tie-break rulings are not included.</p>
  </>
}
