import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'))

  it('renders the fantasy football landing page', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /Make football yours/i })).toBeInTheDocument()
    expect(screen.getAllByText('Live points')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'See the whole pitch.' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('navigates to login and toggles password visibility', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Log in' })[0])
    expect(screen.getByRole('heading', { name: /Ready for the next/i })).toBeInTheDocument()
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
  })
})
