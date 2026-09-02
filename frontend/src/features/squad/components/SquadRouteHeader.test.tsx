import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SquadRouteHeader } from './SquadRouteHeader'

const props = {
  budget: 1000,
  chips: [],
  deadline: 'Sat, 5 Sep, 01:30',
  mode: 'pick-team' as const,
  pickCount: 15,
  spent: 995,
}

describe('SquadRouteHeader', () => {
  it('shows every chip as available when none is active', () => {
    render(<SquadRouteHeader {...props} />)
    expect(screen.getAllByText('Available')).toHaveLength(4)
  })

  it('shows one active chip and makes the others unavailable', () => {
    render(<SquadRouteHeader {...props} activeChip="wildcard" />)
    expect(within(screen.getByText('Wildcard').parentElement!).getByText('Active')).toBeInTheDocument()
    expect(screen.getAllByText('Unavailable')).toHaveLength(3)
  })
})
