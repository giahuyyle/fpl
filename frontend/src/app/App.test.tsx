import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

describe('App', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'))
  afterEach(() => vi.unstubAllGlobals())

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

  it('navigates from login to account creation', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/login')
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Create an account' }))

    expect(screen.getByRole('heading', { level: 1, name: /Build your first squad/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Email address')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
  })

  it('creates a user and opens the authenticated account', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 1,
        username: 'alex',
        email: 'alex@example.com',
        is_active: true,
        email_verified_at: null,
        created_at: '2026-08-25T00:00:00Z',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/signup')
    render(<App />)

    await user.type(screen.getByLabelText('Username'), 'alex')
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password'), 'matchday1')
    await user.type(screen.getByLabelText('Confirm password'), 'matchday1')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Create my account' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/auth/v1/register', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ username: 'alex', email: 'alex@example.com', password: 'matchday1' }),
    })))
    expect(await screen.findByRole('heading', { name: 'Welcome, alex' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/me', { credentials: 'include' })
  })

  it('logs in with remember me and loads the protected account', async () => {
    const user = userEvent.setup()
    const account = {
      id: 1,
      username: 'alex',
      email: 'alex@example.com',
      is_active: true,
      email_verified_at: null,
      created_at: '2026-08-25T00:00:00Z',
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => account })
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/login')
    render(<App />)

    await user.type(screen.getByLabelText('Email address'), account.email)
    await user.type(screen.getByLabelText('Password'), 'matchday1')
    await user.click(screen.getByRole('checkbox', { name: 'Keep me logged in' }))
    await user.click(screen.getByRole('button', { name: /Log in to Fantasy PL/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(1, '/auth/v1/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email: account.email, password: 'matchday1', remember_me: true }),
    })))
    expect(await screen.findByRole('heading', { name: 'Welcome, alex' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/users/me', { credentials: 'include' })
  })

  it('keeps the email and shows a login error', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid email or password' }),
    }))
    window.history.replaceState({}, '', '/login')
    render(<App />)

    const email = screen.getByLabelText('Email address')
    await user.type(email, 'alex@example.com')
    await user.type(screen.getByLabelText('Password'), 'incorrect')
    await user.click(screen.getByRole('button', { name: /Log in to Fantasy PL/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('Invalid email or password')
    expect(email).toHaveValue('alex@example.com')
  })

  it('redirects an unauthenticated account request to login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    window.history.replaceState({}, '', '/account')
    render(<App />)
    expect(await screen.findByRole('heading', { name: /Ready for the next/i })).toBeInTheDocument()
  })

  it('loads the account and logs out', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          username: 'alex',
          email: 'alex@example.com',
          is_active: true,
          email_verified_at: null,
          created_at: '2026-08-25T00:00:00Z',
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/account')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('heading', { name: /Ready for the next/i })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/auth/v1/logout', {
      method: 'POST',
      credentials: 'include',
    })
  })
})
