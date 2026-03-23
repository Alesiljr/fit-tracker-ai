# FitTracker AI

Acompanhamento físico com AI adaptativa que respeita suas preferências.

## Setup

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd fit-tracker-ai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Start development
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all packages in development mode |
| `npm run build` | Build all packages |
| `npm run lint` | Run ESLint across all packages |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run tests across all packages |
| `npm run format` | Format code with Prettier |

### Project Structure

```
fit-tracker-ai/
├── packages/
│   ├── shared/     # Shared types, schemas, constants
│   ├── web/        # Next.js 14 frontend (port 3000)
│   └── api/        # Fastify backend (port 3001)
├── turbo.json      # Turborepo configuration
└── package.json    # Workspace root
```

### Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui
- **Backend:** Fastify, Drizzle ORM
- **Database:** PostgreSQL (Supabase)
- **AI:** Claude API (Anthropic)
- **Deploy:** Vercel (web) + Railway (api)
