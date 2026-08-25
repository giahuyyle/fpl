export type CreateUserPayload = {
  username: string
  email: string
  password: string
}

type FastApiError = {
  detail?: string | Array<{ msg?: string }>
}

function getErrorMessage(body: FastApiError | null, status: number) {
  if (typeof body?.detail === 'string') return body.detail
  if (Array.isArray(body?.detail)) {
    const messages = body.detail.flatMap((issue) => issue.msg ? [issue.msg] : [])
    if (messages.length > 0) return messages.join(' ')
  }
  return `Unable to create your account (${status}). Please try again.`
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
  const response = await fetch('/auth/v1/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as FastApiError | null
    throw new Error(getErrorMessage(body, response.status))
  }
}
