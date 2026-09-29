import { useCallback, useEffect, useRef, useState } from 'react'
import { completeLogin, getToken, signOut, startLogin } from './auth.ts'
import { config, missingConfig } from './config.ts'
import {
  fetchReposWithPrefix,
  fetchUser,
  UnauthorizedError,
  type GitHubRepo,
  type GitHubUser,
} from './github.ts'
import './App.css'

const callbackParams = new URLSearchParams(window.location.search)
const isOAuthCallback = callbackParams.has('code') || callbackParams.has('error')

function App() {
  const [token, setToken] = useState<string | null>(() => (isOAuthCallback ? null : getToken()))
  const [completing, setCompleting] = useState(isOAuthCallback)
  const [loginError, setLoginError] = useState<string | null>(null)
  const exchangeStarted = useRef(false)

  useEffect(() => {
    // The OAuth code is single-use, so make sure StrictMode doesn't exchange it twice.
    if (!isOAuthCallback || exchangeStarted.current) return
    exchangeStarted.current = true

    const code = callbackParams.get('code')
    const state = callbackParams.get('state') ?? ''
    const oauthError = callbackParams.get('error_description') ?? callbackParams.get('error')
    window.history.replaceState(null, '', window.location.pathname)

    const exchange = code
      ? completeLogin(code, state)
      : Promise.reject(new Error(oauthError ?? 'Login was cancelled.'))

    exchange
      .then(setToken)
      .catch((err: Error) => setLoginError(err.message))
      .finally(() => setCompleting(false))
  }, [])

  const handleSignOut = useCallback(() => {
    signOut()
    setToken(null)
  }, [])

  if (missingConfig.length > 0) {
    return (
      <main className="centered">
        <h1>Configuration missing</h1>
        <p>
          Set {missingConfig.map((name) => <code key={name}>{name}</code>)} in <code>.env.local</code>.
        </p>
      </main>
    )
  }

  if (completing) {
    return (
      <main className="centered">
        <p>Signing you in…</p>
      </main>
    )
  }

  if (!token) {
    return (
      <main className="centered">
        <h1>Sidehuset Platform</h1>
        <p>
          Sign in to see your repositories starting with <code>{config.repoPrefix}</code>.
        </p>
        {loginError && <p className="error">{loginError}</p>}
        <button type="button" className="primary" onClick={startLogin}>
          Sign in with GitHub
        </button>
      </main>
    )
  }

  return <RepoList token={token} onSignOut={handleSignOut} />
}

function RepoList({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchUser(token), fetchReposWithPrefix(token, config.repoPrefix)])
      .then(([user, repos]) => {
        if (cancelled) return
        setUser(user)
        setRepos(repos)
      })
      .catch((err: Error) => {
        if (cancelled) return
        if (err instanceof UnauthorizedError) onSignOut()
        else setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [token, onSignOut])

  return (
    <>
      <header className="topbar">
        <strong>Sidehuset Platform</strong>
        <div className="account">
          {user && (
            <a href={user.html_url} target="_blank" rel="noreferrer" className="user">
              <img src={user.avatar_url} alt="" width="28" height="28" />
              {user.login}
            </a>
          )}
          <button type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="content">
        <h1>
          Repos starting with <code>{config.repoPrefix}</code>
        </h1>
        {error ? (
          <p className="error">{error}</p>
        ) : repos === null ? (
          <p>Loading repositories…</p>
        ) : repos.length === 0 ? (
          <p>No repositories found.</p>
        ) : (
          <>
            <p>
              {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
            </p>
            <ul className="repos">
              {repos.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  )
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <li className="repo">
      <div className="repo-title">
        <a href={repo.html_url} target="_blank" rel="noreferrer">
          <span className="owner">{repo.owner.login}/</span>
          {repo.name}
        </a>
        <span className="badge">{repo.private ? 'Private' : 'Public'}</span>
      </div>
      {repo.description && <p>{repo.description}</p>}
      <div className="meta">
        {repo.language && <span>{repo.language}</span>}
        <span>★ {repo.stargazers_count}</span>
        <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
      </div>
    </li>
  )
}

export default App
