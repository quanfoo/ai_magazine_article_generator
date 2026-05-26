# AI Magazine Article Generator

Small monorepo for an internal editorial drafting tool.

## Apps

- `apps/web`: Next.js App Router, TypeScript, Tailwind, shadcn-style local components
- `apps/api`: Rails API, SQLite

## Environment variables

### API (`apps/api`)

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | OpenAI API key used by the article generator. |
| `OPENAI_MODEL` | No | Chat model for generation. Defaults to `gpt-4.1-mini`. |
| `WEB_ORIGIN` | Yes in production | Allowed browser origin for CORS, for example `https://your-web-app.vercel.app`. |
| `SECRET_KEY_BASE` | Yes in production | Rails production secret. Generate with `bin/rails secret`. |

### Web (`apps/web`)

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes in production | Public API base URL, for example `https://ai-magazine-article-api.fly.dev`. |

## Local setup

```bash
cd apps/api
bundle install
bin/rails db:setup
cp .env.example .env
# then edit .env and set OPENAI_API_KEY
bin/rails server -p 3001
```

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` for the web app if your frontend environment does not already default to it.

The API reads the LLM key from `OPENAI_API_KEY`. In local development, `apps/api/.env` is loaded by `apps/api/config/initializers/local_env.rb`; restart Rails after editing it. If the key is missing, uploads create a `failed` article with a clear failure reason instead of saving unvalidated output.

## Deploy API to Fly.io

The Rails API is configured for Fly in `apps/api/fly.toml`. It runs on port `3001` and stores SQLite data on a Fly volume mounted at `/rails/storage`.

1. Install and sign in to the Fly CLI:

```bash
fly auth login
```

2. Review the app name and region in `apps/api/fly.toml`. Change `app = "ai-magazine-article-api"` if that Fly app name is unavailable or if you want a different hostname.

3. Create the Fly app and volume from the API directory:

```bash
cd apps/api
fly apps create ai-magazine-article-api
fly volumes create sqlite_data --region sin --size 1
```

Use the same region as `primary_region` in `fly.toml`.

4. Set production secrets:

```bash
fly secrets set OPENAI_API_KEY=sk-your-key
fly secrets set OPENAI_MODEL=gpt-4.1-mini
fly secrets set SECRET_KEY_BASE=$(bin/rails secret)
fly secrets set WEB_ORIGIN=https://your-web-app.vercel.app
```

`OPENAI_MODEL` is optional; omit it to use the app default.

5. Deploy:

```bash
fly deploy
```

After deployment, the API will be available at:

```text
https://ai-magazine-article-api.fly.dev
```

If you changed the Fly app name, use `https://<your-fly-app-name>.fly.dev`.

## Deploy Web to Vercel / Next.js

The web app is already a Next.js app in `apps/web` and includes `apps/web/vercel.json`.

1. Import the repository into Vercel.
2. Set the Vercel project root directory to `apps/web`.
3. Set the framework preset to `Next.js`.
4. Add this environment variable for Production, Preview, and Development:

```text
NEXT_PUBLIC_API_URL=https://ai-magazine-article-api.fly.dev
```

If you changed the Fly app name, use that API URL instead.

5. Deploy the Vercel project.
6. Copy the deployed Vercel URL and update the Fly API CORS origin:

```bash
cd apps/api
fly secrets set WEB_ORIGIN=https://your-web-app.vercel.app
fly deploy
```

## Deployment Notes

- Do not commit real `.env` files or secrets. Commit only `.env.example` files.
- The Docker build excludes API `.env` files so local secrets are not copied into the image.
- `NEXT_PUBLIC_` variables are bundled into the Next.js client, so only put public browser-safe values there.
- Fly secrets are exposed to the Rails app as runtime environment variables.

References: [Fly secrets](https://fly.io/docs/apps/secrets/), [Fly launch/deploy](https://fly.io/docs/launch/), [Vercel monorepos](https://vercel.com/docs/monorepos/), and [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables).
