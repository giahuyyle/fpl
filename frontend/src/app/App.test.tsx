import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

function squadDataResponse(input: RequestInfo | URL) {
  const url = String(input)
  if (url === '/api/v1/users/me') return jsonResponse({ id: 1, username: 'alex', email: 'alex@example.com', is_active: true, email_verified_at: null, created_at: '2026-08-25T00:00:00Z' })
  if (url === '/api/v1/seasons/current') return jsonResponse({ id: 1, name: '2026/27' })
  if (url.startsWith('/api/v1/teams')) return jsonResponse([])
  if (url === '/api/v1/positions') return jsonResponse([])
  if (url.startsWith('/api/v1/gameweeks')) return jsonResponse([])
  if (url.startsWith('/api/v1/users/me/chips')) return jsonResponse([])
  if (url.startsWith('/api/v1/squads/me')) return jsonResponse(null)
  if (url === '/api/v1/players/search') return jsonResponse({ total: 0, items: [] })
  return null
}

describe('App', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'))
  afterEach(() => vi.unstubAllGlobals())

  it('renders the fantasy football landing page for a signed-out user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: /Make football yours/i })).toBeInTheDocument()
    expect(screen.getAllByText('Live points')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'See the whole pitch.' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders a custom 404 page for an unknown route and returns home', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    window.history.replaceState({}, '', '/missing-page')

    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: /You’ve gone offside/i })).toBeInTheDocument()
    expect(screen.getByText('ERROR 404')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Make football yours/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Back to home/i }))

    expect(await screen.findByRole('heading', { level: 1, name: /Make football yours/i })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('navigates to login and toggles password visibility', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    render(<App />)
    await user.click((await screen.findAllByRole('button', { name: 'Log in' }))[0])
    expect(await screen.findByRole('heading', { name: /Ready for the next/i })).toBeInTheDocument()
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
  })

  it('navigates from login to account creation', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/login')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Create an account' }))

    expect(await screen.findByRole('heading', { level: 1, name: /Build your first squad/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Email address')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
  })

  it('creates a user and opens squad selection', async () => {
    const user = userEvent.setup()
    const account = {
      id: 1,
      username: 'alex',
      email: 'alex@example.com',
      is_active: true,
      email_verified_at: null,
      created_at: '2026-08-25T00:00:00Z',
    }
    let checkedSession = false
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/users/me' && !checkedSession) {
        checkedSession = true
        return jsonResponse(null, 401)
      }
      if (url === '/auth/v1/register') return jsonResponse(null, 201)
      return squadDataResponse(input) ?? jsonResponse(account)
    })
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/signup')
    render(<App />)

    await user.type(await screen.findByLabelText('Username'), 'alex')
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
    expect(await screen.findByRole('region', { name: 'Select all 15 squad players' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/squad/transfers')
  })

  it('logs in with remember me and loads squad selection', async () => {
    const user = userEvent.setup()
    const account = {
      id: 1,
      username: 'alex',
      email: 'alex@example.com',
      is_active: true,
      email_verified_at: null,
      created_at: '2026-08-25T00:00:00Z',
    }
    let checkedSession = false
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/users/me' && !checkedSession) {
        checkedSession = true
        return jsonResponse(null, 401)
      }
      if (url === '/auth/v1/login') return jsonResponse(null, 204)
      return squadDataResponse(input) ?? jsonResponse(account)
    })
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/login')
    render(<App />)

    await user.type(await screen.findByLabelText('Email address'), account.email)
    await user.type(screen.getByLabelText('Password'), 'matchday1')
    await user.click(screen.getByRole('checkbox', { name: 'Keep me logged in' }))
    await user.click(screen.getByRole('button', { name: /Log in to Fantasy PL/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(2, '/auth/v1/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email: account.email, password: 'matchday1', remember_me: true }),
    })))
    expect(await screen.findByRole('region', { name: 'Select all 15 squad players' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/squad/transfers')
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

    const email = await screen.findByLabelText('Email address')
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

  it('loads the transfers route directly', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => squadDataResponse(input) ?? jsonResponse(null, 404)))
    window.history.replaceState({}, '', '/squad/transfers')
    render(<App />)

    expect(await screen.findByRole('region', { name: 'Select all 15 squad players' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/squad/transfers')
  })

  it('redirects an incomplete squad away from pick team', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => squadDataResponse(input) ?? jsonResponse(null, 404)))
    window.history.replaceState({}, '', '/squad/pick')
    render(<App />)

    expect(await screen.findByRole('region', { name: 'Select all 15 squad players' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/squad/transfers')
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

    await user.click(await screen.findByRole('button', { name: 'Account' }))
    await user.click(screen.getByRole('menuitem', { name: 'Logout' }))
    expect(await screen.findByRole('heading', { name: /Ready for the next/i })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/auth/v1/logout', {
      method: 'POST',
      credentials: 'include',
    })
  })

  it('edits and saves personal account details', async () => {
    const user = userEvent.setup()
    const account = {
      id: 1,
      username: 'alex',
      email: 'alex@example.com',
      is_active: true,
      email_verified_at: null,
      created_at: '2026-08-25T00:00:00Z',
      settings: {
        first_name: 'Alex',
        last_name: 'Morgan',
        date_of_birth: null,
        gender: '',
        country: '',
        nationality: '',
        different_nationality: false,
        email_news: false,
        email_fantasy: false,
        appearance: 'light',
        interests: [],
      },
    }
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/v1/users/me' && init?.method === 'PATCH') {
        return jsonResponse({ ...account, username: 'captain' })
      }
      if (String(input) === '/api/v1/users/me') return jsonResponse(account)
      return jsonResponse(null, 404)
    })
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/account')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Personal details' })).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toHaveValue('Alex')
    await user.clear(screen.getByLabelText('Username'))
    await user.type(screen.getByLabelText('Username'), 'captain')
    await user.selectOptions(screen.getByLabelText('Country of residence'), 'GB')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Your changes have been saved.')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/me', expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
      body: expect.stringContaining('"country":"GB"'),
    }))
  })

  it('validates password confirmation before changing a password', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/v1/users/me') return squadDataResponse(input)!
      return jsonResponse(null, 404)
    }))
    window.history.replaceState({}, '', '/account')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Account security' }))
    await user.type(screen.getByLabelText('Current password'), 'matchday1')
    await user.type(screen.getByLabelText('New password'), 'new-matchday2')
    await user.type(screen.getByLabelText('Confirm new password'), 'different2')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('New passwords do not match.')
  })

  it('redirects an authenticated user from home to their squad', async () => {
    const user = userEvent.setup()
    const account = {
      id: 1,
      username: 'alex',
      email: 'alex@example.com',
      is_active: true,
      email_verified_at: null,
      created_at: '2026-08-25T00:00:00Z',
    }
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/v1/users/me') return jsonResponse(account)
      return squadDataResponse(input) ?? jsonResponse(null, 404)
    })
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/account')
    render(<App />)

    await screen.findByRole('heading', { name: 'Personal details' })
    await user.click(screen.getByRole('button', { name: 'Fantasy PL home' }))

    expect(await screen.findByRole('region', { name: 'Select all 15 squad players' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/squad/transfers')
    expect(screen.queryByRole('heading', { name: /Make football yours/i })).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith('/auth/v1/logout', expect.anything())
  })

  it.each(['/login', '/signup'])('redirects an authenticated user away from %s', async (path) => {
    const account = {
      id: 1,
      username: 'alex',
      email: 'alex@example.com',
      is_active: true,
      email_verified_at: null,
      created_at: '2026-08-25T00:00:00Z',
    }
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/v1/users/me') return jsonResponse(account)
      return squadDataResponse(input) ?? jsonResponse(null, 404)
    })
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', path)
    render(<App />)

    expect(await screen.findByRole('region', { name: 'Select all 15 squad players' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/squad/transfers')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/me', { credentials: 'include' })
  })
})
