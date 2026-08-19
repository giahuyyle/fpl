import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'


describe('App', () => {
  it('renders the starter content and external links', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Get started' }),
    ).toBeInTheDocument()
    expect(screen.getByText('HMR')).toBeInTheDocument()
    expect(screen.getByAltText('React logo')).toBeInTheDocument()
    expect(screen.getByAltText('Vite logo')).toBeInTheDocument()

    const expectedLinks = new Map([
      ['Explore Vite', 'https://vite.dev/'],
      ['Learn more', 'https://react.dev/'],
      ['GitHub', 'https://github.com/vitejs/vite'],
      ['Discord', 'https://chat.vite.dev/'],
      ['X.com', 'https://x.com/vite_js'],
      ['Bluesky', 'https://bsky.app/profile/vite.dev'],
    ])

    for (const [name, href] of expectedLinks) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
    }
  })

  it('increments the counter on every click', async () => {
    const user = userEvent.setup()
    render(<App />)
    const counter = screen.getByRole('button', { name: 'Count is 0' })

    await user.click(counter)
    expect(counter).toHaveTextContent('Count is 1')

    await user.click(counter)
    expect(counter).toHaveTextContent('Count is 2')
  })
})

