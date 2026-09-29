const API = 'https://api.github.com'

export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  private: boolean
  language: string | null
  stargazers_count: number
  updated_at: string
  owner: { login: string }
}

export class UnauthorizedError extends Error {}

async function request(token: string, url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (res.status === 401) throw new UnauthorizedError('GitHub session expired.')
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`)
  return res
}

function nextPageUrl(linkHeader: string | null): string | null {
  const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/)
  return match ? match[1] : null
}

export async function fetchUser(token: string): Promise<GitHubUser> {
  const res = await request(token, `${API}/user`)
  return res.json()
}

/** Fetches every repo the user can access and keeps those whose name starts with `prefix`. */
export async function fetchReposWithPrefix(token: string, prefix: string): Promise<GitHubRepo[]> {
  const needle = prefix.toLowerCase()
  const params = new URLSearchParams({
    per_page: '100',
    affiliation: 'owner,collaborator,organization_member',
  })
  let url: string | null = `${API}/user/repos?${params}`
  const matches: GitHubRepo[] = []

  while (url) {
    const res = await request(token, url)
    const page = (await res.json()) as GitHubRepo[]
    matches.push(...page.filter((repo) => repo.name.toLowerCase().startsWith(needle)))
    url = nextPageUrl(res.headers.get('Link'))
  }

  return matches.sort((a, b) => a.full_name.localeCompare(b.full_name))
}
