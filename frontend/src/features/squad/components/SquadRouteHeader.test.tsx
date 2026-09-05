import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SquadRouteHeader } from './SquadRouteHeader'

const chips = [
  { id: 1, fpl_id: 1, season_id: 1, name: 'bboost', number: 1, chip_type: 'team', start_gameweek_id: 1, end_gameweek_id: 19, status: 'available' as const },
  { id: 2, fpl_id: 2, season_id: 1, name: '3xc', number: 1, chip_type: 'team', start_gameweek_id: 1, end_gameweek_id: 19, status: 'available' as const },
  { id: 3, fpl_id: 3, season_id: 1, name: 'wildcard', number: 1, chip_type: 'transfer', start_gameweek_id: 1, end_gameweek_id: 19, status: 'available' as const },
  { id: 4, fpl_id: 4, season_id: 1, name: 'freehit', number: 1, chip_type: 'transfer', start_gameweek_id: 1, end_gameweek_id: 19, status: 'available' as const },
]

const props = {
  budget: 1000,
  chips,
  deadline: 'Sat, 5 Sep, 01:30',
  mode: 'pick-team' as const,
  pickCount: 15,
  squadValue: 995,
}

describe('SquadRouteHeader', () => {
  it('shows every chip as available when none is active', () => {
    render(<SquadRouteHeader {...props} />)
    expect(screen.getAllByText('Available')).toHaveLength(4)
  })

  it('shows one active chip and makes the others unavailable', () => {
    render(<SquadRouteHeader {...props} chips={chips.map((chip) => ({ ...chip, status: chip.name === 'wildcard' ? 'active' as const : 'unavailable' as const }))} />)
    expect(within(screen.getByText('Wildcard').parentElement!).getByText('Active')).toBeInTheDocument()
    expect(screen.getAllByText('Unavailable')).toHaveLength(3)
  })

  it('requests activation and cancellation from the chip controls', () => {
    const onChipChange = vi.fn()
    const { rerender } = render(<SquadRouteHeader {...props} onChipChange={onChipChange} />)
    screen.getByRole('button', { name: 'Activate Wildcard' }).click()
    expect(onChipChange).toHaveBeenCalledWith(chips[2])

    const active = chips.map((chip) => ({ ...chip, status: chip.name === 'wildcard' ? 'active' as const : 'unavailable' as const }))
    rerender(<SquadRouteHeader {...props} chips={active} onChipChange={onChipChange} />)
    screen.getByRole('button', { name: 'Cancel Wildcard' }).click()
    expect(onChipChange).toHaveBeenLastCalledWith(active[2])
  })

  it('labels the remaining transfer funds as budget', () => {
    render(<SquadRouteHeader {...props} budget={-2} mode="transfers" />)
    const summary = screen.getByRole('region', { name: 'Transfers summary' })
    expect(within(summary).getByText('Budget')).toBeInTheDocument()
    expect(within(summary).getByText('£-0.2m')).toHaveClass('text-pl-pink')
    expect(within(summary).queryByText('Money left')).not.toBeInTheDocument()
  })

  it('shows official and calculated gameweek points', () => {
    const onNextGameweek = vi.fn()
    const onPreviousGameweek = vi.fn()
    render(<SquadRouteHeader {...props} canGoNextGameweek canGoPreviousGameweek gameweekName="Gameweek 2" mode="view" onNextGameweek={onNextGameweek} onPreviousGameweek={onPreviousGameweek} points={{
      gameweek: { id: 2, name: 'Gameweek 2', number: 2, deadline_time: '2026-08-28T17:30:00Z', finished: true },
      has_snapshot: true, is_backfilled: true, provisional: false,
      average_points: 60, highest_points: 130, points: 92, transfer_cost: 0,
      total_points: 166, gameweek_rank: 1, overall_rank: 1, total_squads: 1,
      transfers: 0, free_transfers: 2, next_free_transfers: 3,
      points_on_bench: 4, picks: [],
    }} squadName="Alex XI" />)
    const summary = screen.getByRole('region', { name: 'Alex XI summary' })
    expect(within(summary).getByText('Gameweek 2')).toBeInTheDocument()
    expect(within(summary).getByText('92')).toBeInTheDocument()
    expect(within(summary).getByText('Backfilled check')).toBeInTheDocument()
    within(summary).getByRole('button', { name: 'Previous gameweek' }).click()
    within(summary).getByRole('button', { name: 'Next gameweek' }).click()
    expect(onPreviousGameweek).toHaveBeenCalledOnce()
    expect(onNextGameweek).toHaveBeenCalledOnce()
  })

  it('disables gameweek navigation at the available range edges', () => {
    render(<SquadRouteHeader {...props} gameweekName="Gameweek 1" mode="view" />)
    expect(screen.getByRole('button', { name: 'Previous gameweek' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next gameweek' })).toBeDisabled()
  })
})
