# Sidehuset Platform

Sign in with GitHub and list every repository you can access whose name starts with a fixed prefix (`VITE_REPO_PREFIX`).

- `src/` — Vite + React app, hosted on GitHub Pages.
- `worker/` — Cloudflare Worker that swaps the OAuth `code` for an access token. GitHub Pages is static and can't hold the OAuth client secret, so this is the only server-side piece.

## Setup

### 1. Create a GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.

- **Homepage URL:** `https://<github-user>.github.io/<repo>/`
- **Authorization callback URL:** `https://<github-user>.github.io/<repo>/`

An OAuth App has one callback URL, so create a second app for local development with callback `http://localhost:5173/`.

The app requests the `repo` and `read:org` scopes. To see an organization's private repos, an org owner may need to approve the OAuth App (Org settings → Third-party access).

### 2. Deploy the Worker

```sh
cd worker
yarn install
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
yarn deploy
```

Edit `ALLOWED_ORIGINS` in `worker/wrangler.toml` to include your Pages origin (`https://<github-user>.github.io`) before deploying.

### 3. Configure GitHub Pages

In the repository: Settings → Pages → Source: **GitHub Actions**. Then Settings → Secrets and variables → Actions → **Variables**:

| Variable | Value |
| --- | --- |
| `VITE_GITHUB_CLIENT_ID` | Client ID of the production OAuth App |
| `VITE_AUTH_WORKER_URL` | URL of the deployed Worker, e.g. `https://sidehuset-github-auth.<account>.workers.dev` |
| `VITE_REPO_PREFIX` | The repo name prefix to list, e.g. `sidehuset-` |

Pushing to `main` builds and deploys via `.github/workflows/deploy.yml`.

## Local development

```sh
# Worker (port 8787)
cp worker/.dev.vars.example worker/.dev.vars   # fill in the local OAuth App's id + secret
cd worker && yarn dev

# App (port 5173), in another terminal
cp .env.example .env.local                      # fill in the local OAuth App's client id + prefix
yarn install
yarn dev
```
