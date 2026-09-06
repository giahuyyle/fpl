import { describe, expect, it } from 'vitest'
import type { Fixture, Team } from '../squad/api/squadApi'
import { standings } from './leagueData'
const teams: Team[] = [1, 2, 3].map(id => ({ id, name: `Club ${id}`, code: id, short_name: `C${id}` }))
const match = (id: number, h: number, a: number, hs: number | null, as: number | null, finished = true) => ({ id, home_team: teams[h - 1], away_team: teams[a - 1], home_score: hs, away_score: as, finished, kickoff_time: `2026-09-0${id}T12:00:00Z` }) as Fixture

describe('standings', () => {
  it('counts completed results, goal difference and form, ignoring live and missing scores', () => {
    const rows = standings(teams, [match(1, 1, 2, 2, 0), match(2, 2, 3, 1, 1), match(3, 3, 1, 5, 0, false), match(4, 1, 3, null, null)])
    expect(rows.map(r => r.team.id)).toEqual([1, 3, 2])
    expect(rows[0]).toMatchObject({ played: 1, won: 1, points: 3, gd: 2, form: ['W'] })
    expect(rows[2]).toMatchObject({ played: 2, drawn: 1, lost: 1, points: 1, gf: 1, ga: 3, form: ['L', 'D'] })
  })
  it('restricts results to the selected venue', () => {
    const fixtures = [match(1, 1, 2, 2, 0), match(2, 2, 1, 3, 0)]
    expect(standings(teams, fixtures, 'home').find(r => r.team.id === 1)).toMatchObject({ points: 3, played: 1 })
    expect(standings(teams, fixtures, 'away').find(r => r.team.id === 1)).toMatchObject({ points: 0, played: 1 })
  })
})
