import { config } from './config.ts'

const TOKEN_KEY = 'github_token'
const STATE_KEY = 'github_oauth_state'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY)
}

export function startLogin() {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: config.githubClientId,
    redirect_uri: config.redirectUri,
    scope: 'repo read:org',
    state,
  })
  window.location.assign(`https://github.com/login/oauth/authorize?${params}`)
}

/** Exchanges the OAuth `code` for an access token via the Cloudflare Worker. */
export async function completeLogin(code: string, state: string): Promise<string> {
  const expectedState = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  if (!expectedState || expectedState !== state) {
    throw new Error('Login state mismatch. Please try signing in again.')
  }

  const res = await fetch(`${config.authWorkerUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? 'Could not complete login.')
  }

  localStorage.setItem(TOKEN_KEY, data.access_token)
  return data.access_token
}
