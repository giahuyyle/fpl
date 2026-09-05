import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FixturesPanel } from './FixturesPanel'

describe('FixturesPanel', () => {
  it('keeps the unavailable state concise', () => {
    render(<FixturesPanel gameweeks={[]} />)

    expect(screen.getByText('Fixtures unavailable')).toBeInTheDocument()
    expect(screen.queryByText(/current dataset/i)).not.toBeInTheDocument()
  })
})
