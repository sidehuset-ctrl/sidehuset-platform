const env = import.meta.env

export const config = {
  githubClientId: env.VITE_GITHUB_CLIENT_ID ?? '',
  authWorkerUrl: (env.VITE_AUTH_WORKER_URL ?? '').replace(/\/$/, ''),
  repoPrefix: env.VITE_REPO_PREFIX ?? '',
  redirectUri: window.location.origin + import.meta.env.BASE_URL,
}

export const missingConfig = [
  ['VITE_GITHUB_CLIENT_ID', config.githubClientId],
  ['VITE_AUTH_WORKER_URL', config.authWorkerUrl],
  ['VITE_REPO_PREFIX', config.repoPrefix],
]
  .filter(([, value]) => !value)
  .map(([name]) => name)
