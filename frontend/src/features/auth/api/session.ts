export type User = {
  settings?: AccountSettings
  id: number
  username: string
  email: string
  is_active: boolean
  email_verified_at: string | null
  created_at: string
}

export type LoginPayload = {
  email: string
  password: string
  remember_me: boolean
}

type FastApiError = {
  detail?: string | Array<{ msg?: string }>
}

export class AuthenticationRequiredError extends Error {}

async function errorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as FastApiError | null
  if (typeof body?.detail === 'string') return body.detail
  if (Array.isArray(body?.detail)) {
    const messages = body.detail.flatMap((issue) => issue.msg ? [issue.msg] : [])
    if (messages.length > 0) return messages.join(' ')
  }
  return fallback
}

export async function login(payload: LoginPayload): Promise<void> {
  const response = await fetch('/auth/v1/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Unable to log in. Please try again.'))
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetch('/api/v1/users/me', {
    credentials: 'include',
  })
  if (response.status === 401) {
    throw new AuthenticationRequiredError('Authentication required')
  }
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Unable to load your account.'))
  }
  return await response.json() as User
}

export async function logout(): Promise<void> {
  const response = await fetch('/auth/v1/logout', {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Unable to log out.'))
  }
}

export type AccountSettings = {
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: '' | 'male' | 'female' | 'non-binary' | 'prefer-not-to-say'
  country: string
  nationality: string
  different_nationality: boolean
  email_news: boolean
  email_fantasy: boolean
  appearance: 'light' | 'dark' | 'system'
  interests: Array<'matches' | 'fantasy' | 'players' | 'clubs'>
}

export const defaultAccountSettings: AccountSettings = {
  first_name: '', last_name: '', date_of_birth: null, gender: '', country: '', nationality: '',
  different_nationality: false, email_news: false, email_fantasy: false, appearance: 'light', interests: [],
}

export async function updateAccount(payload: { username?: string; email?: string; settings?: Partial<AccountSettings> }): Promise<User> {
  const response = await fetch('/api/v1/users/me', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload),
  })
  if (response.status === 401) throw new AuthenticationRequiredError('Authentication required')
  if (!response.ok) throw new Error(await errorMessage(response, 'Unable to save your settings.'))
  return response.json() as Promise<User>
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const response = await fetch('/api/v1/users/me/password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
  if (response.status === 401) throw new AuthenticationRequiredError('Authentication required')
  if (!response.ok) throw new Error(await errorMessage(response, 'Unable to change your password.'))
}
