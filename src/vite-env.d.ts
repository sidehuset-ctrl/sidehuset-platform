/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_CLIENT_ID: string
  readonly VITE_AUTH_WORKER_URL: string
  readonly VITE_REPO_PREFIX: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
