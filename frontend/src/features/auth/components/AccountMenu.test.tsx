import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountMenu } from './AccountMenu'

describe('AccountMenu', () => {
  beforeEach(() => window.history.replaceState({}, '', '/matches'))

  it('opens the account actions and navigates to settings', async () => {
    const user = userEvent.setup()
    render(<AccountMenu />)

    const trigger = screen.getByRole('button', { name: 'Account' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveFocus()
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'Settings' }))
    expect(window.location.pathname).toBe('/account')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<AccountMenu />)

    const trigger = screen.getByRole('button', { name: 'Account' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('runs the supplied logout action', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn().mockResolvedValue(undefined)
    render(<AccountMenu onLogout={onLogout} />)

    await user.click(screen.getByRole('button', { name: 'Account' }))
    await user.click(screen.getByRole('menuitem', { name: 'Logout' }))

    expect(onLogout).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes when clicking outside the menu', async () => {
    const user = userEvent.setup()
    render(<div><AccountMenu /><button type="button">Outside</button></div>)

    await user.click(screen.getByRole('button', { name: 'Account' }))
    await user.click(screen.getByRole('button', { name: 'Outside' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
