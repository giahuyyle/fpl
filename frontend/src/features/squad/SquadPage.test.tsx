import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SquadPage } from './SquadPage'
import type { Gameweek, Player, Position, Squad, SquadPoints } from './api/squadApi'

const positions: Position[] = [
  { id: 1, code: 'GKP', name: 'Goalkeeper', squad_select: 2, min_play: 1, max_play: 1 },
  { id: 2, code: 'DEF', name: 'Defender', squad_select: 5, min_play: 3, max_play: 5 },
  { id: 3, code: 'MID', name: 'Midfielder', squad_select: 5, min_play: 2, max_play: 5 },
  { id: 4, code: 'FWD', name: 'Forward', squad_select: 3, min_play: 1, max_play: 3 },
]

const teams = [
  { id: 1, name: 'Club One', short_name: 'ONE', code: 10 },
  { id: 2, name: 'Club Two', short_name: 'TWO', code: 20 },
  { id: 3, name: 'Club Three', short_name: 'THR', code: 30 },
  { id: 4, name: 'Club Four', short_name: 'FOR', code: 40 },
  { id: 5, name: 'Club Five', short_name: 'FIV', code: 50 },
]

function player(id: number, code: Position['code'], teamId = ((id - 1) % 5) + 1, cost = 40 + id): Player {
  const position = positions.find((item) => item.code === code)!
  return {
    id,
    fpl_id: id,
    first_name: `First${id}`,
    last_name: `Last${id}`,
    web_name: `Player ${String(id).padStart(2, '0')}`,
    photo: null,
    status: 'a',
    can_select: true,
    team: teams.find((team) => team.id === teamId)!,
    position: { id: position.id, code: position.code, name: position.name },
    stats: {
      now_cost: cost,
      form: id,
      points_per_game: id,
      selected_by_percent: id,
      total_points: id * 10,
    } as Player['stats'],
  }
}

const allPlayers = [
  ...[1, 2].map((id) => player(id, 'GKP')),
  ...[3, 4, 5, 6, 7].map((id) => player(id, 'DEF')),
  ...[8, 9, 10, 11, 12].map((id) => player(id, 'MID')),
  ...[13, 14, 15].map((id) => player(id, 'FWD')),
]

const defaultLineupOrder = [1, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 2, 7, 12, 15]

function response(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

function squadFrom(players: Player[], complete: boolean): Squad {
  const lineupPositions = Object.fromEntries(defaultLineupOrder.map((slot, index) => [slot, index + 1]))
  const picks = players.map((item, index) => ({
    id: index + 1,
    slot: index + 1,
    lineup_position: complete ? lineupPositions[index + 1] : null,
    purchase_price: item.stats.now_cost,
    selling_price: item.stats.now_cost,
    is_captain: complete && index + 1 === 13,
    is_vice_captain: complete && index + 1 === 14,
    player: item,
  }))
  const spent = players.reduce((total, item) => total + item.stats.now_cost, 0)
  return {
    id: 1, user_id: 1, season_id: 1, is_complete: complete,
    name: 'Alex XI', badge_style: 'classic-purple', favorite_teams: [teams[0]],
    spent, budget: 1000, remaining_budget: 1000 - spent,
    created_at: '2026-08-30T00:00:00Z', updated_at: '2026-08-30T00:00:00Z', picks,
  }
}

function pointsFor(gameweek: Gameweek, squad: Squad, playerPoints = 1): SquadPoints {
  const picks = squad.picks.map((pick) => ({
    player_id: pick.player.id,
    slot: pick.slot,
    lineup_position: pick.lineup_position!,
    played: true,
    points: playerPoints,
    multiplier: pick.is_captain ? 2 : pick.lineup_position! <= 11 ? 1 : 0,
    effective_points: playerPoints * (pick.is_captain ? 2 : pick.lineup_position! <= 11 ? 1 : 0),
    was_auto_subbed: false,
    is_captain: pick.is_captain,
    is_vice_captain: pick.is_vice_captain,
    player: pick.player,
  }))
  return {
    gameweek,
    has_snapshot: true,
    is_backfilled: false,
    provisional: !gameweek.finished,
    average_points: 0,
    highest_points: null,
    points: picks.reduce((total, pick) => total + pick.effective_points, 0),
    transfer_cost: 0,
    total_points: picks.reduce((total, pick) => total + pick.effective_points, 0),
    gameweek_rank: null,
    overall_rank: null,
    total_squads: 1,
    transfers: 0,
    free_transfers: 1,
    next_free_transfers: 2,
    points_on_bench: 4 * playerPoints,
    picks,
  }
}

function fetchRouter(initialSquad: Squad | null = null, searchItems: Player[] = [allPlayers[0]], pointsHistory: SquadPoints[] = []) {
  let chipStates = [
    { id: 1, fpl_id: 1, season_id: 1, name: 'bboost', number: 1, chip_type: 'single', start_gameweek_id: 1, end_gameweek_id: 38, status: 'available' },
    { id: 2, fpl_id: 2, season_id: 1, name: '3xc', number: 1, chip_type: 'single', start_gameweek_id: 1, end_gameweek_id: 38, status: 'available' },
    { id: 3, fpl_id: 3, season_id: 1, name: 'wildcard', number: 1, chip_type: 'transfer', start_gameweek_id: 1, end_gameweek_id: 38, status: 'available' },
    { id: 4, fpl_id: 4, season_id: 1, name: 'freehit', number: 1, chip_type: 'transfer', start_gameweek_id: 1, end_gameweek_id: 38, status: 'available' },
  ]
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url === '/api/v1/seasons/current') return response({ id: 1, name: '2026/27' })
    if (url === '/api/v1/users/me') return response({ id: 1, username: 'alex', email: 'alex@example.com', is_active: true, email_verified_at: null, created_at: '2026-08-30T00:00:00Z' })
    if (url.startsWith('/api/v1/teams')) return response(teams)
    if (url === '/api/v1/positions') return response(positions)
    if (url.startsWith('/api/v1/gameweeks')) return response([{
      id: 1, name: 'Gameweek 1', number: 1,
      deadline_time: '2099-09-01T12:00:00Z', finished: false,
    }])
    if (url.startsWith('/api/v1/users/me/chips') && (!init?.method || init.method === 'GET')) return response(chipStates)
    if (url === '/api/v1/users/me/chips/active' && init?.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as { chip_id: number | null }
      chipStates = chipStates.map((chip) => ({
        ...chip,
        status: body.chip_id === null ? 'available' : chip.id === body.chip_id ? 'active' : 'unavailable',
      }))
      return response(chipStates)
    }
    if (url.startsWith('/api/v1/squads/me/points/history')) return response(pointsHistory)
    if (url.startsWith('/api/v1/squads/me') && (!init?.method || init.method === 'GET')) return response(initialSquad)
    if (url.startsWith('/api/v1/fixtures')) return response([{
      id: 1,
      fpl_id: 1,
      gameweek_id: 1,
      home_team: teams[0],
      away_team: teams[1],
      home_score: null,
      away_score: null,
      kickoff_time: '2099-09-02T12:00:00Z',
      started: false,
      finished: false,
      finished_provisional: false,
      minutes: 0,
      home_difficulty: 2,
      away_difficulty: 4,
    }])
    if (url === '/api/v1/players/search') return response({ total: searchItems.length, items: searchItems })
    if (url === '/api/v1/squads/me' && init?.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as { picks: Array<{ slot: number; player_id: number; lineup_position?: number; is_captain?: boolean; is_vice_captain?: boolean }> }
      const selected = body.picks.map((pick) => allPlayers.find((item) => item.id === pick.player_id)!)
      const saved = squadFrom(selected, selected.length === 15)
      saved.picks = body.picks.map((pick, index) => ({
        id: index + 1,
        slot: pick.slot,
        lineup_position: pick.lineup_position ?? null,
        purchase_price: selected[index].stats.now_cost,
        selling_price: selected[index].stats.now_cost,
        is_captain: pick.is_captain ?? false,
        is_vice_captain: pick.is_vice_captain ?? false,
        player: selected[index],
      }))
      return response(saved)
    }
    if (url === '/api/v1/squads/me/profile' && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as { name: string; badge_style: Squad['badge_style']; favorite_team_ids: number[] }
      return response({
        ...(initialSquad ?? squadFrom([], false)),
        name: body.name,
        badge_style: body.badge_style,
        favorite_teams: teams.filter((team) => body.favorite_team_ids.includes(team.id)),
      })
    }
    return response({ detail: 'Not found' }, 404)
  })
}

describe('SquadPage', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/squad')
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows 15 slots, searches filters, adds a player, and saves a draft', async () => {
    const user = userEvent.setup()
    const fetchMock = fetchRouter()
    vi.stubGlobal('fetch', fetchMock)
    render(<SquadPage />)

    expect(await screen.findByRole('dialog', { name: 'Create your squad' })).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Squad name'))
    await user.type(screen.getByLabelText('Squad name'), 'Matchday Makers')
    await user.click(screen.getByLabelText('Cyan'))
    await user.click(screen.getByLabelText('Club One'))
    await user.click(screen.getByRole('button', { name: 'Create squad' }))
    expect(await screen.findByText('Squad created.')).toHaveClass('text-[#05633d]')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(await screen.findByRole('region', { name: 'Select all 15 squad players' })).toBeInTheDocument()
    const summary = screen.getByRole('region', { name: 'Transfers summary' })
    expect(within(summary).getByRole('heading', { name: 'Transfers' })).toBeInTheDocument()
    expect(within(summary).getByText(/^Deadline:/)).toBeInTheDocument()
    expect(within(summary).getByText('0 / 15')).toBeInTheDocument()
    expect(within(summary).getByText('£100.0m')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Select empty/ })).toHaveLength(15)
    const squadColumn = screen.getByRole('group', { name: 'Squad selection and fixtures' })
    expect(within(squadColumn).getByRole('heading', { name: 'Fixtures' })).toBeInTheDocument()
    expect(screen.getByText('Gameweek 1')).toBeInTheDocument()

    await screen.findByText('Player 01')
    expect(screen.getByRole('img', { name: 'Club One kit' })).toHaveAttribute(
      'src',
      '/kits/2026-27/shirt_10_1-220.webp',
    )
    expect(screen.getByText('ONE')).toBeInTheDocument()
    expect(document.querySelector('.player-market-columns')).toHaveTextContent('PriceTPAdd')
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([input]) => String(input) === '/api/v1/players/search')
      const body = JSON.parse(String(calls.at(-1)?.[1]?.body))
      expect(body.sort_by).toBe('now_cost')
      expect(body.sort_direction).toBe('desc')
    })
    await user.click(screen.getByRole('button', { name: 'View Player 01 details' }))
    const marketDrawer = screen.getByRole('dialog', { name: 'Player 01 actions' })
    expect(within(marketDrawer).getByText('Total points')).toBeInTheDocument()
    expect(within(marketDrawer).getByText('£4.1m')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save draft · 0/15' })).toBeInTheDocument()
    await user.click(within(marketDrawer).getByRole('button', { name: 'Add player' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save draft · 1/15' })).toBeInTheDocument()
    const pickedPlayer = screen.getByRole('button', { name: 'Open actions for Player 01' })
    expect(within(pickedPlayer).queryByRole('img', { name: 'Club One crest' })).not.toBeInTheDocument()
    expect(within(pickedPlayer).queryByText('Club One')).not.toBeInTheDocument()
    expect(within(pickedPlayer).getByText('TWO (H)')).toBeInTheDocument()
    expect(within(pickedPlayer).getByText('£4.1m')).toBeInTheDocument()
    const pickedKit = pickedPlayer.querySelector('img[src="/kits/2026-27/shirt_10_1-220.webp"]')!
    expect(pickedKit).toBeInTheDocument()
    fireEvent.error(pickedKit)
    expect(within(pickedPlayer).getByRole('img', { name: 'Generic player portrait' })).toBeInTheDocument()
    await user.click(pickedPlayer)
    const playerDrawer = screen.getByRole('dialog', { name: 'Player 01 actions' })
    expect(playerDrawer).toBeInTheDocument()
    expect(within(playerDrawer).getByText('Goalkeeper')).toBeInTheDocument()
    expect(within(playerDrawer).getByText('Pts / Match')).toBeInTheDocument()
    expect(within(playerDrawer).getByText('Selected')).toBeInTheDocument()
    expect(within(playerDrawer).getByRole('region', { name: 'Player fixtures' })).toBeInTheDocument()
    expect(within(playerDrawer).getByText('TWO (H)')).toBeInTheDocument()
    expect(pickedPlayer.className).not.toContain('ring-')
    await user.click(screen.getByRole('button', { name: 'Close player actions' }))

    await user.selectOptions(screen.getByLabelText('Club'), '1')
    await user.type(screen.getByLabelText('Search player'), 'Raya')
    await user.selectOptions(screen.getByLabelText('Sort players by'), 'form')
    await user.type(screen.getByLabelText('Minimum price'), '4.0')
    await user.type(screen.getByLabelText('Maximum price'), '7.5')
    await user.type(screen.getByLabelText('Minimum form'), '1')
    await user.selectOptions(screen.getByLabelText('Advanced statistic'), 'expected_goals')
    await user.type(screen.getByLabelText('Statistic minimum'), '0.5')
    await user.type(screen.getByLabelText('Statistic maximum'), '5')
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([input]) => String(input) === '/api/v1/players/search')
      const body = JSON.parse(String(calls.at(-1)?.[1]?.body))
      expect(body.team_ids).toEqual([1])
      expect(body.query).toBe('Raya')
      expect(body.sort_by).toBe('form')
      expect(body.filters).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'now_cost', minimum: 40, maximum: 75 }),
        expect.objectContaining({ field: 'form', minimum: 1 }),
        expect.objectContaining({ field: 'expected_goals', minimum: 0.5, maximum: 5 }),
      ]))
    })

    await user.click(screen.getByRole('button', { name: /Save draft/ }))
    expect(await screen.findByText('Draft squad saved.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/squads/me', expect.objectContaining({ method: 'PUT' }))
    const saveCall = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/v1/squads/me' && init?.method === 'PUT')
    expect(JSON.parse(String(saveCall?.[1]?.body))).toMatchObject({ gameweek_number: 1 })
  })

  it('edits the XI separately from the bench, assigns captaincy, and substitutes', async () => {
    const user = userEvent.setup()
    const fetchMock = fetchRouter(squadFrom(allPlayers, true), allPlayers)
    vi.stubGlobal('fetch', fetchMock)
    render(<SquadPage />)

    const savedPitch = await screen.findByRole('region', { name: 'Saved starting squad' })
    expect(screen.getByRole('region', { name: 'Alex XI summary' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Alex XI summary' })).getByText('Average points')).toBeInTheDocument()
    const squadInfo = screen.getByRole('complementary', { name: 'Squad information' })
    expect(within(squadInfo).getByRole('heading', { name: 'Alex XI' })).toBeInTheDocument()
    expect(within(squadInfo).getByText('alex')).toBeInTheDocument()
    expect(within(squadInfo).getAllByRole('img', { name: 'Alex XI badge' })).toHaveLength(2)
    expect(within(squadInfo).getByRole('heading', { name: 'Team badge' })).toBeInTheDocument()
    expect(within(squadInfo).getByRole('heading', { name: 'Fan league' })).toBeInTheDocument()
    expect(within(squadInfo).getByText('Club One')).toBeInTheDocument()
    await user.click(within(squadInfo).getByRole('button', { name: 'Edit details' }))
    expect(screen.getByRole('dialog', { name: 'Edit squad' })).toBeInTheDocument()
    expect(screen.getByLabelText('Squad name')).toHaveValue('Alex XI')
    expect(screen.getByLabelText('Classic')).toBeChecked()
    expect(screen.getByLabelText('Club One')).toBeChecked()
    await user.clear(screen.getByLabelText('Squad name'))
    await user.type(screen.getByLabelText('Squad name'), 'Title Winners')
    await user.click(screen.getByLabelText('Pink'))
    await user.click(screen.getByLabelText('Club Two'))
    await user.click(screen.getByRole('button', { name: 'Save details' }))
    expect(await screen.findByText('Squad details saved.')).toHaveClass('text-[#05633d]')
    expect(within(squadInfo).getByRole('heading', { name: 'Title Winners' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Player search' })).not.toBeInTheDocument()
    expect(within(savedPitch).getAllByText(/Player/)).toHaveLength(15)
    expect(screen.getByText('Substitutes')).toBeInTheDocument()
    const cardClasses = Array.from(
      savedPitch.querySelectorAll('img[src^="/kits/"]'),
      (kit) => kit.parentElement?.parentElement?.className,
    )
    expect(cardClasses).toHaveLength(15)
    expect(new Set(cardClasses)).toHaveProperty('size', 1)
    expect(within(savedPitch).getAllByText('TWO (H)')).toHaveLength(3)
    expect(within(savedPitch).getAllByRole('button', { name: /^Open actions/ })).toHaveLength(15)
    await user.click(within(savedPitch).getByRole('button', { name: 'Open actions for Player 01' }))
    const viewDrawer = screen.getByRole('dialog', { name: 'Player 01 actions' })
    expect(within(viewDrawer).queryByRole('button', { name: 'Make captain' })).not.toBeInTheDocument()
    expect(within(viewDrawer).queryByRole('button', { name: 'Substitute' })).not.toBeInTheDocument()
    await user.click(within(viewDrawer).getByRole('button', { name: 'Close player actions' }))
    await user.click(screen.getByRole('button', { name: 'Fantasy PL home' }))
    expect(window.location.pathname).toBe('/')
    window.history.replaceState({}, '', '/squad')
    await user.click(screen.getByRole('button', { name: 'Account' }))
    await user.click(screen.getByRole('menuitem', { name: 'Settings' }))
    expect(window.location.pathname).toBe('/account')
    window.history.replaceState({}, '', '/squad')
    await user.click(screen.getByRole('button', { name: 'Pick team' }))
    expect(window.location.pathname).toBe('/squad/pick')
    expect(screen.getByRole('region', { name: 'Pick Team summary' })).toBeInTheDocument()
    const pickTeamPlayer = screen.getByRole('button', { name: 'Open actions for Player 01' })
    expect(within(pickTeamPlayer).getByText('TWO (H)')).toBeInTheDocument()
    expect(within(pickTeamPlayer).queryByText('£4.1m')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Pick Team summary' })).getAllByText('Available')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'Activate Wildcard' }))
    expect(await screen.findByText('Wildcard activated.')).toHaveClass('text-[#05633d]')
    expect(screen.getByRole('button', { name: 'Cancel Wildcard' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByText('Unavailable')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Cancel Wildcard' }))
    expect(await screen.findByText('Wildcard deactivated.')).toHaveClass('text-[#05633d]')
    expect(screen.getAllByText('Available')).toHaveLength(4)
    const editPitch = screen.getByRole('region', { name: 'Edit starting XI and substitutes' })
    expect(within(editPitch).getAllByRole('button', { name: /^Open actions/ })).toHaveLength(15)
    expect(within(editPitch).getByText('Substitutes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open actions for Player 01' }))
    await user.click(screen.getByRole('button', { name: 'Make captain' }))
    expect(screen.getByRole('button', { name: 'Captain ✓' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Close player actions' }))

    await user.click(screen.getByRole('button', { name: 'Open actions for Player 06' }))
    await user.click(screen.getByRole('button', { name: 'Substitute' }))
    expect(screen.getByRole('status')).toHaveTextContent('Select another player')
    await user.click(screen.getByRole('button', { name: 'Open actions for Player 12' }))
    expect(screen.getByRole('status')).toHaveTextContent('Substitution staged')
    expect(screen.getByRole('status')).toHaveClass('bg-[#ddf8e7]', 'text-[#05633d]')

    await user.click(screen.getByRole('button', { name: 'Save team' }))
    expect(await screen.findByText('Squad changes saved.')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/squad')
    const saveCalls = fetchMock.mock.calls.filter(([input, init]) => String(input) === '/api/v1/squads/me' && init?.method === 'PUT')
    const body = JSON.parse(String(saveCalls.at(-1)?.[1]?.body)) as { picks: Array<{ slot: number; lineup_position: number; is_captain: boolean }> }
    expect(body.picks.find((pick) => pick.slot === 1)?.is_captain).toBe(true)
    expect(body.picks.find((pick) => pick.slot === 12)?.lineup_position).toBeLessThanOrEqual(11)
    expect(body.picks.find((pick) => pick.slot === 6)?.lineup_position).toBeGreaterThan(11)
  })

  it('saves a completed fifteenth pick and shows the final squad', async () => {
    const user = userEvent.setup()
    const draft = squadFrom(allPlayers.slice(0, 14), false)
    vi.stubGlobal('fetch', fetchRouter(draft, [allPlayers[14]]))
    render(<SquadPage />)
    await screen.findByRole('region', { name: 'Select all 15 squad players' })
    await user.click(screen.getByRole('button', { name: 'Select empty FWD slot 15' }))
    await user.click(await screen.findByRole('button', { name: 'Add Player 15' }))
    await user.click(screen.getByRole('button', { name: 'Save squad' }))
    expect(await screen.findByText('Squad changes saved.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Saved starting squad' })).toBeInTheDocument()
  })

  it('removes, restores, and targets a replacement while keeping local recovery', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', fetchRouter(squadFrom(allPlayers, true), [allPlayers[1]]))
    render(<SquadPage />)
    await screen.findByRole('region', { name: 'Saved starting squad' })

    await user.click(screen.getByRole('button', { name: 'Transfers' }))
    expect(window.location.pathname).toBe('/squad/transfers')
    expect(screen.getByRole('region', { name: 'Select all 15 squad players' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Transfers summary' })).getByText('15 / 15')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open actions for Player 01' }))
    await user.click(screen.getByRole('button', { name: 'Select replacement' }))
    expect(screen.getByRole('button', { name: 'Select empty GKP slot 1' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('fpl:squad-recovery:1') ?? '{}')['1'].id).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Select empty GKP slot 1' }))
    await user.click(screen.getByRole('button', { name: 'Restore original' }))
    expect(screen.queryByRole('button', { name: 'Select empty GKP slot 1' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('was restored')

    await user.click(screen.getByRole('button', { name: 'Open actions for Player 01' }))
    await user.click(screen.getByRole('button', { name: 'Remove player' }))
    await user.click(screen.getByRole('button', { name: 'Select replacement' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select empty GKP slot 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Select a replacement' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('group', { name: 'Confirm squad reset' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Select empty GKP slot 1' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await user.click(screen.getByRole('button', { name: 'Yes, reset' }))
    expect(screen.queryByRole('button', { name: 'Select empty GKP slot 1' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open actions for Player 01' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Make transfers' })).toBeEnabled()
    expect(JSON.parse(window.localStorage.getItem('fpl:squad-recovery:1') ?? '{}')).toEqual({})
  })

  it('shows load, search, and save errors without losing the draft', async () => {
    const loadFailure = vi.fn(() => response({ detail: 'Season service unavailable' }, 503))
    vi.stubGlobal('fetch', loadFailure)
    const first = render(<SquadPage />)
    expect(await screen.findByText('Season service unavailable')).toBeInTheDocument()
    first.unmount()

    let failSearch = true
    const draft = squadFrom([allPlayers[0]], false)
    const routed = fetchRouter(draft, [allPlayers[1]])
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/v1/players/search' && failSearch) {
        failSearch = false
        return response({ detail: 'Search temporarily unavailable' }, 503)
      }
      if (String(input) === '/api/v1/squads/me' && init?.method === 'PUT') {
        return response({ detail: 'Draft was rejected' }, 422)
      }
      return routed(input, init)
    }))
    render(<SquadPage />)
    expect(await screen.findByText('Search temporarily unavailable')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Save draft/ }))
    expect(await screen.findByText('Draft was rejected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save draft · 1/15' })).toBeInTheDocument()
  })

  it('uses local kits with a generic fallback and supports the final finished gameweek', async () => {
    const withPhoto = { ...allPlayers[0], photo: '123.jpg' }
    const complete = squadFrom([withPhoto, ...allPlayers.slice(1)], true)
    const routed = fetchRouter(complete, [])
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/v1/gameweeks')) return response([{
        id: 38, name: 'Gameweek 38', number: 38,
        deadline_time: '2027-05-20T12:00:00Z', finished: true,
      }])
      return routed(input, init)
    }))
    render(<SquadPage />)
    await screen.findByRole('region', { name: 'Saved starting squad' })
    const kit = document.querySelector('img[src="/kits/2026-27/shirt_10_1-220.webp"]') as HTMLImageElement
    expect(kit).not.toBeNull()
    const portrait = kit.parentElement!
    fireEvent.error(kit)
    expect(kit).not.toBeInTheDocument()
    expect(within(portrait).getByRole('img', { name: 'Generic player portrait' })).toBeInTheDocument()
    expect(screen.getAllByText('Gameweek 38')).toHaveLength(2)
  })

  it('exposes exactly one upcoming gameweek from the squad view', async () => {
    const user = userEvent.setup()
    const routed = fetchRouter(squadFrom(allPlayers, true), [])
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/v1/gameweeks')) return response([
        {
          id: 1, name: 'Gameweek 1', number: 1,
          deadline_time: '2000-08-20T12:00:00Z', finished: true,
        },
        {
          id: 2, name: 'Gameweek 2', number: 2,
          deadline_time: '2099-08-27T12:00:00Z', finished: false,
        },
        {
          id: 3, name: 'Gameweek 3', number: 3,
          deadline_time: '2099-09-03T12:00:00Z', finished: false,
        },
      ])
      if (String(input).startsWith('/api/v1/fixtures')) return response([{
        id: 2,
        fpl_id: 2,
        gameweek_id: 2,
        home_team: teams[0],
        away_team: teams[1],
        home_score: null,
        away_score: null,
        kickoff_time: '2099-08-28T12:00:00Z',
        started: false,
        finished: false,
        finished_provisional: false,
        minutes: 0,
        home_difficulty: 2,
        away_difficulty: 4,
      }])
      return routed(input, init)
    }))

    render(<SquadPage routeMode="view" />)

    const summary = await screen.findByRole('region', { name: 'Alex XI summary' })
    expect(within(summary).getByText('Gameweek 1')).toBeInTheDocument()
    const next = within(summary).getByRole('button', { name: 'Next gameweek' })
    expect(next).toBeEnabled()
    await user.click(next)
    expect(within(summary).getByText('Gameweek 2')).toBeInTheDocument()
    expect(within(summary).queryByText('Gameweek 3')).not.toBeInTheDocument()
    const pitch = screen.getByRole('region', { name: 'Saved starting squad' })
    expect(within(pitch).getAllByText('TWO (H)')).toHaveLength(3)
    expect(within(pitch).queryByText(/ pts$/)).not.toBeInTheDocument()
    expect(next).toBeDisabled()
  })

  it('defaults to the ongoing gameweek even when only the previous week has a snapshot', async () => {
    const complete = squadFrom(allPlayers, true)
    const previous: Gameweek = {
      id: 2, name: 'Gameweek 2', number: 2,
      deadline_time: '2000-08-20T12:00:00Z', finished: true,
    }
    const current: Gameweek = {
      id: 3, name: 'Gameweek 3', number: 3,
      deadline_time: '2000-08-27T12:00:00Z', finished: false,
    }
    const upcoming: Gameweek = {
      id: 4, name: 'Gameweek 4', number: 4,
      deadline_time: '2099-09-03T12:00:00Z', finished: false,
    }
    const routed = fetchRouter(complete, [], [pointsFor(previous, complete)])
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/v1/gameweeks')) return response([previous, current, upcoming])
      return routed(input, init)
    }))

    render(<SquadPage routeMode="view" />)

    const summary = await screen.findByRole('region', { name: 'Alex XI summary' })
    expect(within(summary).getByText('Gameweek 3')).toBeInTheDocument()
    expect(within(summary).queryByText('Gameweek 2')).not.toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: 'Next gameweek' })).toBeEnabled()
  })

  it('refreshes provisional points while a gameweek is ongoing', async () => {
    const complete = squadFrom(allPlayers, true)
    const current: Gameweek = {
      id: 3, name: 'Gameweek 3', number: 3,
      deadline_time: '2000-08-27T12:00:00Z', finished: false,
    }
    const initialPoints = pointsFor(current, complete, 1)
    const updatedPoints = pointsFor(current, complete, 3)
    const routed = fetchRouter(complete, [], [initialPoints])
    let historyRequests = 0
    let refreshLive: (() => void) | undefined
    vi.spyOn(window, 'setInterval').mockImplementation((handler: TimerHandler) => {
      if (typeof handler === 'function') refreshLive = () => handler()
      return 1
    })
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/v1/gameweeks')) return response([current])
      if (String(input).startsWith('/api/v1/squads/me/points/history')) {
        historyRequests += 1
        return response([historyRequests === 1 ? initialPoints : updatedPoints])
      }
      return routed(input, init)
    }))

    render(<SquadPage routeMode="view" />)

    const pitch = await screen.findByRole('region', { name: 'Saved starting squad' })
    const playerCard = within(pitch).getByText('Player 01').parentElement!
    expect(within(playerCard).getByText('1 pts')).toBeInTheDocument()
    expect(refreshLive).toBeTypeOf('function')
    await act(async () => { refreshLive?.() })
    await waitFor(() => expect(within(playerCard).getByText('3 pts')).toBeInTheDocument())
  })

  it('shows effective gameweek points on view-mode cards', async () => {
    const complete = squadFrom(allPlayers, true)
    const gameweek = {
      id: 1, name: 'Gameweek 1', number: 1,
      deadline_time: '2000-08-20T12:00:00Z', finished: true,
    }
    const points: SquadPoints = {
      gameweek,
      has_snapshot: true,
      is_backfilled: false,
      provisional: false,
      average_points: 50,
      highest_points: 100,
      points: 118,
      transfer_cost: 0,
      total_points: 118,
      gameweek_rank: 1,
      overall_rank: 1,
      total_squads: 1,
      transfers: 0,
      free_transfers: 1,
      next_free_transfers: 2,
      points_on_bench: 0,
      picks: complete.picks.map((pick) => ({
        player_id: pick.player.id,
        slot: pick.slot,
        lineup_position: pick.lineup_position!,
        played: true,
        points: pick.slot,
        multiplier: pick.is_captain ? 2 : 1,
        effective_points: pick.is_captain ? pick.slot * 2 : pick.slot,
        was_auto_subbed: false,
        is_captain: pick.is_captain,
        is_vice_captain: pick.is_vice_captain,
        player: pick.player,
      })),
    }
    const routed = fetchRouter(complete, [], [points])
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/v1/gameweeks')) return response([gameweek])
      return routed(input, init)
    }))

    render(<SquadPage routeMode="view" />)

    const pitch = await screen.findByRole('region', { name: 'Saved starting squad' })
    expect(within(pitch).getByText('26 pts')).toBeInTheDocument()
    expect(within(pitch).queryByText('13 pts')).not.toBeInTheDocument()
  })

  it('shows the fixture until a player has played in the selected gameweek', async () => {
    const complete = squadFrom(allPlayers, true)
    const gameweek: Gameweek = {
      id: 1, name: 'Gameweek 1', number: 1,
      deadline_time: '2000-08-20T12:00:00Z', finished: false,
    }
    const points = pointsFor(gameweek, complete, 0)
    points.picks[0].played = false
    const routed = fetchRouter(complete, [], [points])
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/v1/gameweeks')) return response([gameweek])
      return routed(input, init)
    }))

    render(<SquadPage routeMode="view" />)

    const pitch = await screen.findByRole('region', { name: 'Saved starting squad' })
    const unplayedCard = within(pitch).getByText('Player 01').parentElement!
    const playedCard = within(pitch).getByText('Player 02').parentElement!
    expect(within(unplayedCard).getByText('TWO (H)')).toBeInTheDocument()
    expect(within(unplayedCard).queryByText('0 pts')).not.toBeInTheDocument()
    expect(within(playedCard).getByText('0 pts')).toBeInTheDocument()
  })

  it('shows budget and club-limit feedback before saving', async () => {
    const user = userEvent.setup()
    const threeFromOneClub = [
      player(1, 'GKP', 1),
      player(2, 'GKP', 1),
      player(3, 'DEF', 1),
    ]
    const expensive = player(4, 'DEF', 2, 1001)
    const fourthClubPlayer = player(5, 'DEF', 1)
    vi.stubGlobal('fetch', fetchRouter(squadFrom(threeFromOneClub, false), [fourthClubPlayer, expensive]))
    render(<SquadPage />)
    await screen.findByRole('region', { name: 'Select all 15 squad players' })

    await user.click(screen.getByRole('button', { name: 'Select empty DEF slot 4' }))
    await user.click(await screen.findByRole('button', { name: 'Add Player 05' }))
    expect(screen.getByRole('status')).toHaveTextContent('no more than three players')
    await user.click(screen.getByRole('button', { name: 'Add Player 04' }))
    expect(screen.getByRole('status')).toHaveTextContent('Over budget by £12.7m')
    expect(screen.getByRole('button', { name: 'Over budget by £12.7m' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Open actions for Player 04' })).toBeInTheDocument()
  })
})
