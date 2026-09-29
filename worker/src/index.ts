/**
 * Exchanges a GitHub OAuth `code` for an access token. The client secret must
 * stay server-side, and GitHub's token endpoint doesn't allow browser CORS
 * requests, so the static site calls this Worker instead.
 */
interface Env {
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  /** Comma-separated list of origins allowed to call the Worker. */
  ALLOWED_ORIGINS: string
}

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? ''
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    if (!allowed.includes(origin)) {
      return new Response('Forbidden', { status: 403 })
    }
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const url = new URL(request.url)
    if (request.method !== 'POST' || url.pathname !== '/token') {
      return json({ error: 'not_found' }, 404, cors)
    }

    const { code } = (await request.json().catch(() => ({}))) as { code?: string }
    if (!code) {
      return json({ error: 'missing_code' }, 400, cors)
    }

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })
    const data = (await res.json()) as {
      access_token?: string
      error?: string
      error_description?: string
    }

    if (!data.access_token) {
      return json(
        { error: data.error ?? 'exchange_failed', error_description: data.error_description },
        400,
        cors,
      )
    }
    return json({ access_token: data.access_token }, 200, cors)
  },
}
