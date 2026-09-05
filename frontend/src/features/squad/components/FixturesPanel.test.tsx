import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FixturesPanel } from './FixturesPanel'

describe('FixturesPanel', () => {
  it('keeps the unavailable state concise', () => {
    render(<FixturesPanel gameweeks={[]} />)

    expect(screen.getByText('Fixtures unavailable')).toBeInTheDocument()
    expect(screen.queryByText(/current dataset/i)).not.toBeInTheDocument()
  })

  it('renders scores and changes gameweek', async () => {
    const onGameweekChange = vi.fn()
    const gameweeks = [
      { id: 1, name: 'Gameweek 1', number: 1, deadline_time: '2026-08-21T17:30:00Z', finished: true },
      { id: 2, name: 'Gameweek 2', number: 2, deadline_time: '2026-08-28T17:30:00Z', finished: true },
    ]
    render(<FixturesPanel fixtures={[{
      id: 10, fpl_id: 20, gameweek_id: 2,
      home_team: { id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 },
      away_team: { id: 2, name: 'Chelsea', short_name: 'CHE', code: 8 },
      home_score: 2, away_score: 1, kickoff_time: '2026-08-29T14:00:00Z',
      started: true, finished: true, finished_provisional: false, minutes: 90,
      home_difficulty: 2, away_difficulty: 4,
    }]} gameweeks={gameweeks} onGameweekChange={onGameweekChange} selectedGameweekNumber={2} />)

    expect(screen.getByText('2 – 1')).toBeInTheDocument()
    expect(screen.getByText('Arsenal')).toBeInTheDocument()
    expect(screen.getByText('Chelsea')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Previous gameweek' }))
    expect(onGameweekChange).toHaveBeenCalledWith(1)
  })
})
