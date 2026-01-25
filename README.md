# Minti

A personal finance dashboard with AI-powered insights, bank account integration, and budget tracking.

## Features

- **Bank Account Integration** - Connect accounts via Plaid with secure token storage
- **Real-time Balances** - View balances and transactions across all connected accounts
- **AI Financial Assistant** - Chat with Claude for personalized financial advice
- **Budget Tracking** - Set monthly category budgets and track spending
- **Analytics Dashboard** - Visualize income, spending trends, and category breakdowns
- **Subscription Detection** - Automatically identify recurring charges

## Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/minti.git
   cd minti
   pnpm install
   ```

2. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your API keys (see Environment Variables below).

3. **Set up Supabase database**
   - Create a project at [supabase.com](https://supabase.com)
   - Run the SQL from `supabase/schema.sql` in the SQL Editor
   - Add `http://localhost:3000/auth/callback` to Authentication > URL Configuration

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `NEXT_PUBLIC_SITE_URL` | Your app URL (e.g., `http://localhost:3000`) | Yes |
| `PLAID_CLIENT_ID` | Plaid client ID | Yes |
| `PLAID_SECRET` | Plaid secret key | Yes |
| `PLAID_ENV` | `sandbox` or `production` | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Yes |

## Supabase Setup

Run the complete schema in `supabase/schema.sql` which includes:
- 6 database tables with RLS policies
- Vault functions for secure Plaid token storage
- Storage bucket for user avatars

## Tech Stack

Next.js 16, Supabase, Plaid, Claude AI, Tailwind CSS, shadcn/ui, Recharts

## License

MIT
