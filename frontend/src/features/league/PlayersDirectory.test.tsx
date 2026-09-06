import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { PlayersDirectory } from './PlayersDirectory'
import type { LeagueData } from './leagueData'
import { searchPlayers } from '../squad/api/squadApi'
vi.mock('../squad/api/squadApi', () => ({ searchPlayers: vi.fn() }))
const data: LeagueData = { season: { id: 1, name: '2026/27' }, teams: [], positions: [], fixtures: [], gameweeks: [] }
afterEach(() => vi.resetAllMocks())
it('requests surname ordering across pages and resets pagination when searching', async () => {
  vi.mocked(searchPlayers).mockResolvedValue({ total: 51, items: [] })
  const user = userEvent.setup()
  render(<PlayersDirectory data={data} />)
  await waitFor(() => expect(searchPlayers).toHaveBeenCalledWith(expect.objectContaining({ sort_by: 'last_name', sort_direction: 'asc', offset: 0, limit: 25, selectable_only: false })))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(searchPlayers).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 25 })))
  await user.type(screen.getByRole('searchbox'), 'Abbott')
  await waitFor(() => expect(searchPlayers).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0, query: 'Abbott' })))
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
})
it('shows search errors and lets the user retry', async () => {
  vi.mocked(searchPlayers).mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({ total: 0, items: [] })
  const user = userEvent.setup()
  render(<PlayersDirectory data={data} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost')
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('heading', { name: 'No players found' })).toBeInTheDocument()
})
