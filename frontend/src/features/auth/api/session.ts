export type User = {
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
