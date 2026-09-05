import { AuthenticationRequiredError } from '../../auth/api/session'

export type Season = {
  id: number
  name: string
}

export type Team = {
  id: number
  name: string
  short_name: string
  code: number
}

export type Position = {
  id: number
  code: 'GKP' | 'DEF' | 'MID' | 'FWD'
  name: string
  squad_select: number
  min_play: number
  max_play: number
}

export type Gameweek = {
  id: number
  name: string
  number: number
  deadline_time: string
  finished: boolean
}

export type Chip = {
  id: number
  fpl_id: number
  season_id: number
  name: string
  number: number
  chip_type: string
  start_gameweek_id: number
  end_gameweek_id: number
}

export type PlayerStats = {
  minutes: number
  starts: number
  goals_scored: number
  assists: number
  clean_sheets: number
  goals_conceded: number
  own_goals: number
  penalties_saved: number
  penalties_missed: number
  yellow_cards: number
  red_cards: number
  saves: number
  bonus: number
  bps: number
  influence: number
  creativity: number
  threat: number
  ict_index: number
  clearances_blocks_interceptions: number
  recoveries: number
  tackles: number
  defensive_contribution: number
  expected_goals: number
  expected_assists: number
  expected_goal_involvements: number
  expected_goals_conceded: number
  total_points: number
  points_per_game: number
  now_cost: number
  form: number
  selected_by_percent: number
  transfers_in: number
  transfers_out: number
  transfers_in_event: number
  transfers_out_event: number
  event_points: number
  chance_of_playing_next_round: number | null
  chance_of_playing_this_round: number | null
  ep_next: number | null
  ep_this: number | null
  dreamteam_count: number
  in_dreamteam: boolean
  value_form: number
  value_season: number
}

export type Player = {
  id: number
  fpl_id: number
  first_name: string
  last_name: string
  web_name: string
  photo: string | null
  status: string
  can_select: boolean
  team: Team
  position: Pick<Position, 'id' | 'code' | 'name'>
  stats: PlayerStats
}

export type PlayerSearchResponse = {
  total: number
  items: Player[]
}

export type SquadPick = {
  id: number
  slot: number
  lineup_position: number | null
  purchase_price: number
  selling_price: number
  is_captain: boolean
  is_vice_captain: boolean
  player: Player
}

export type Squad = {
  id: number
  user_id: number
  season_id: number
  is_complete: boolean
  spent: number
  budget: number
  remaining_budget: number
  created_at: string
  updated_at: string
  picks: SquadPick[]
}

export type StatFilter = {
  field: string
  minimum?: number
  maximum?: number
}

export type SearchPayload = {
  season_id: number
  query?: string
  team_ids?: number[]
  position_ids?: number[]
  filters?: StatFilter[]
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  offset?: number
  limit?: number
}

export type SquadPickPayload = {
  slot: number
  player_id: number
  lineup_position?: number
  is_captain?: boolean
  is_vice_captain?: boolean
}

type FastApiError = {
  detail?: string | Array<{ msg?: string }>
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as FastApiError | null
  if (typeof body?.detail === 'string') return body.detail
  if (Array.isArray(body?.detail)) {
    const messages = body.detail.flatMap((issue) => issue.msg ? [issue.msg] : [])
    if (messages.length) return messages.join(' ')
  }
  return fallback
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' })
  if (response.status === 401) throw new AuthenticationRequiredError('Authentication required')
  if (!response.ok) throw new Error(await responseError(response, 'Unable to load squad data.'))
  return await response.json() as T
}

export async function loadSquadPageData() {
  const season = await getJson<Season>('/api/v1/seasons/current')
  const [teams, positions, gameweeks, chips, squad] = await Promise.all([
    getJson<Team[]>(`/api/v1/teams?season_id=${season.id}`),
    getJson<Position[]>('/api/v1/positions'),
    getJson<Gameweek[]>(`/api/v1/gameweeks?season_id=${season.id}`),
    getJson<Chip[]>(`/api/v1/chips?season_id=${season.id}`),
    getJson<Squad | null>(`/api/v1/squads/me?season_id=${season.id}`),
  ])
  return { season, teams, positions, gameweeks, chips, squad }
}

export async function searchPlayers(payload: SearchPayload): Promise<PlayerSearchResponse> {
  const response = await fetch('/api/v1/players/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await responseError(response, 'Unable to search players.'))
  return await response.json() as PlayerSearchResponse
}

export async function saveSquad(
  seasonId: number,
  picks: SquadPickPayload[],
): Promise<Squad> {
  const response = await fetch('/api/v1/squads/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ season_id: seasonId, picks }),
  })
  if (response.status === 401) throw new AuthenticationRequiredError('Authentication required')
  if (!response.ok) throw new Error(await responseError(response, 'Unable to save your squad.'))
  return await response.json() as Squad
}
