import type { Fixture, Gameweek, Position, Season, Team } from '../squad/api/squadApi'

async function read<T>(path: string): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, { credentials: 'include' })
  if (!response.ok) throw new Error('League data could not be loaded. Please try again.')
  return response.json() as Promise<T>
}

export async function loadLeagueData() {
  const season = await read<Season>('seasons/current')
  const [teams, positions, gameweeks, fixtures] = await Promise.all([
    read<Team[]>(`teams?season_id=${season.id}`), read<Position[]>('positions'),
    read<Gameweek[]>(`gameweeks?season_id=${season.id}`), read<Fixture[]>(`fixtures?season_id=${season.id}`),
  ])
  return { season, teams: teams.sort((a, b) => a.name.localeCompare(b.name)), positions, gameweeks: gameweeks.sort((a, b) => a.number - b.number), fixtures }
}
export type LeagueData = Awaited<ReturnType<typeof loadLeagueData>>

export function standings(teams: Team[], fixtures: Fixture[], venue = 'all') {
  const rows = new Map(teams.map(team => [team.id, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, form: [] as string[] }]))
  const completed = fixtures.filter(f => (f.finished || f.finished_provisional) && f.home_score !== null && f.away_score !== null)
    .sort((a, b) => (a.kickoff_time ?? '').localeCompare(b.kickoff_time ?? '') || a.id - b.id)
  for (const fixture of completed) {
    for (const home of [true, false]) {
      if (venue === 'home' && !home || venue === 'away' && home) continue
      const row = rows.get(home ? fixture.home_team.id : fixture.away_team.id)
      if (!row) continue
      const gf = (home ? fixture.home_score : fixture.away_score)!
      const ga = (home ? fixture.away_score : fixture.home_score)!
      row.played++; row.gf += gf; row.ga += ga; row.gd = row.gf - row.ga
      if (gf > ga) { row.won++; row.points += 3; row.form.push('W') }
      else if (gf === ga) { row.drawn++; row.points++; row.form.push('D') }
      else { row.lost++; row.form.push('L') }
    }
  }
  return [...rows.values()].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name))
}
