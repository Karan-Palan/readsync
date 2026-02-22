# ReadSync

An AI-powered reading companion that helps you read smarter. Upload EPUBs and PDFs, track your reading progress, highlight passages, get AI-powered explanations and summaries, and monitor your reading habits — all in one place.

Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

## Features

- **Book Library** — Upload and manage EPUB & PDF books with cover extraction
- **In-browser Reader** — Read books directly in the browser using [foliate-js](https://github.com/nicothin/foliate-js) with progress tracking
- **Highlights & Notes** — Highlight text, add notes, and colour-code passages
- **AI Assistant** — Explain, summarize, extract key points, or discuss any highlighted passage (powered by Groq)
- **Book Summaries** — Generate full-book AI summaries in one click
- **Dashboard & Analytics** — Track reading streaks, books read, AI usage, projected yearly reading pace, and set yearly reading goals
- **Chapters** — Manually define chapter ranges for any book
- **Authentication** — Email/password auth via Better Auth
- **Dark Mode** — System-aware theme toggle

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| API | tRPC (end-to-end type-safe) |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Auth | Better Auth |
| AI | Groq (OpenAI-compatible) via Vercel AI SDK |
| File Upload | UploadThing |
| Monorepo | Turborepo + bun workspaces |
| Linting | Biome |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0
- PostgreSQL instance (local or hosted, e.g. Prisma Postgres)

### Install

```bash
bun install
```

### Environment Variables

Create `apps/web/.env` (see `packages/env/src/server.ts` for the full schema):

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="min-32-char-secret"
BETTER_AUTH_URL="http://localhost:3001"
CORS_ORIGIN="http://localhost:3001"
GROQ_API_KEY="gsk_..."
UPLOADTHING_TOKEN="..."
OPENAI_API_KEY="sk-..."          # optional
POLAR_ACCESS_TOKEN="..."         # optional – payments
POLAR_SUCCESS_URL="..."          # optional – payments
```

### Database

```bash
bun run db:push      # push schema to database
bun run db:generate  # generate Prisma client types
bun run db:migrate   # run migrations
bun run db:studio    # open Prisma Studio
```

### Development

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Project Structure

```
readsync/
├── apps/
│   └── web/                    # Next.js fullstack app
│       ├── public/foliate-js/  # In-browser EPUB/PDF reader engine
│       └── src/
│           ├── app/            # App Router pages
│           │   ├── dashboard/  # Reading analytics & goal setting
│           │   ├── library/    # Book library grid
│           │   ├── notes/      # All highlights across books
│           │   ├── reader/     # Book reader view
│           │   └── summaries/  # AI-generated book summaries
│           ├── components/     # React components + shadcn/ui
│           ├── lib/            # Auth client, utils
│           ├── types/          # Shared TypeScript types
│           └── utils/          # tRPC client, UploadThing
├── packages/
│   ├── api/                    # tRPC routers & business logic
│   │   └── src/routers/        # book, highlight, chapter, ai, dashboard
│   ├── auth/                   # Better Auth config
│   ├── config/                 # Shared TypeScript config
│   ├── db/                     # Prisma schema & migrations
│   │   └── prisma/schema/      # auth.prisma, book.prisma, schema.prisma
│   └── env/                    # Environment variable validation (t3-env)
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all apps in dev mode |
| `bun run build` | Build all apps |
| `bun run check-types` | TypeScript type-check across workspaces |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:studio` | Open Prisma Studio |
| `bun run check` | Biome lint & format |

## Deployment

Deployed on Vercel. All required environment variables must be set in the Vercel project settings — see the env list above. The `turbo.json` `globalEnv` array declares all env vars used during build.
