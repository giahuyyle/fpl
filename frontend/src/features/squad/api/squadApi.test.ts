import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthenticationRequiredError } from '../../auth/api/session'
import { loadSquadPageData, saveSquad, searchPlayers, setActiveChip } from './squadApi'

function response(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

describe('squad API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads the season and its related squad data', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/seasons/current') return response({ id: 7, name: '2026/27' })
      if (url.startsWith('/api/v1/teams')) return response([{ id: 1 }])
      if (url === '/api/v1/positions') return response([{ id: 2 }])
      if (url.startsWith('/api/v1/gameweeks')) return response([{ id: 3 }])
      if (url.startsWith('/api/v1/users/me/chips')) return response([{ id: 4, name: 'wildcard', status: 'available' }])
      return response(null)
    }))

    const data = await loadSquadPageData()
    expect(data.season.id).toBe(7)
    expect(data.teams).toHaveLength(1)
    expect(data.positions).toHaveLength(1)
    expect(data.gameweeks).toHaveLength(1)
    expect(data.chips).toHaveLength(1)
    expect(data.squad).toBeNull()
  })

  it('surfaces authentication and backend load errors', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response(null, 401)))
    await expect(loadSquadPageData()).rejects.toBeInstanceOf(AuthenticationRequiredError)

    vi.stubGlobal('fetch', vi.fn(() => response({ detail: 'No current season' }, 404)))
    await expect(loadSquadPageData()).rejects.toThrow('No current season')
  })

  it('formats validation arrays and fallback search errors', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({
      detail: [{ msg: 'Minimum is invalid' }, {}, { msg: 'Maximum is invalid' }],
    }, 422)))
    await expect(searchPlayers({ season_id: 1 })).rejects.toThrow(
      'Minimum is invalid Maximum is invalid',
    )

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      json: async () => { throw new Error('invalid json') },
    })))
    await expect(searchPlayers({ season_id: 1 })).rejects.toThrow('Unable to search players')
  })

  it('returns search results and handles save authentication and validation', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ total: 0, items: [] })))
    await expect(searchPlayers({ season_id: 1 })).resolves.toEqual({ total: 0, items: [] })

    vi.stubGlobal('fetch', vi.fn(() => response(null, 401)))
    await expect(saveSquad(1, [])).rejects.toBeInstanceOf(AuthenticationRequiredError)

    vi.stubGlobal('fetch', vi.fn(() => response({ detail: [] }, 422)))
    await expect(saveSquad(1, [])).rejects.toThrow('Unable to save your squad')

    const saved = { id: 1, picks: [] }
    const fetchMock = vi.fn(() => response(saved))
    vi.stubGlobal('fetch', fetchMock)
    await expect(saveSquad(2, [{ slot: 1, player_id: 9 }], 3)).resolves.toEqual(saved)
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/squads/me', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ season_id: 2, picks: [{ slot: 1, player_id: 9 }], gameweek_number: 3 }),
    }))
  })

  it('persists the active chip selection', async () => {
    const states = [{ id: 4, name: 'wildcard', status: 'active' }]
    const fetchMock = vi.fn(() => response(states))
    vi.stubGlobal('fetch', fetchMock)

    await expect(setActiveChip(2, 4, 3)).resolves.toEqual(states)
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/me/chips/active', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ season_id: 2, chip_id: 4, gameweek_number: 3 }),
    }))
  })
})
