# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**Financial Data:**
- **Plaid** - Bank account aggregation and transaction data
  - SDK: `plaid` v39.1.0
  - Client setup: `lib/plaid.ts`
  - Auth: Environment variables `PLAID_CLIENT_ID`, `PLAID_SECRET`
  - Environment: Configurable via `PLAID_ENV` (sandbox/development/production)
  - API Routes:
    - `app/api/plaid/create-link-token/route.ts` - Initiates Plaid Link modal
    - `app/api/plaid/exchange-public-token/route.ts` - Exchanges public token for access token
    - `app/api/plaid/balance/route.ts` - Fetches account balances
    - `app/api/plaid/transactions/route.ts` - Fetches account transactions
    - `app/api/plaid/analytics/route.ts` - Analytics endpoint (exists, function TBD)
  - Features used:
    - Products: Auth, Transactions
    - Countries: US only
    - Account balance retrieval
    - Transaction history (configurable date range, default 30 days)
    - Institution lookup and metadata

**AI/LLM:**
- **Anthropic Claude** - AI assistant for financial advice
  - SDK: `@ai-sdk/anthropic` v3.0.16
  - Model: `claude-haiku-4-5-20251001`
  - Auth: Environment variable `ANTHROPIC_API_KEY` (server-side only)
  - Implementation:
    - `lib/ai/system-prompt.ts` - System prompt generation
    - `lib/ai/financial-context.ts` - Financial context building for personalization
    - `app/api/ai/chat/route.ts` - Streaming chat endpoint
  - Features:
    - Streaming text responses
    - Financial personalization with user's account data
    - Session-based conversation storage

**Analytics:**
- **Vercel Web Analytics** - Performance and user analytics
  - Package: `@vercel/analytics` v1.3.1
  - Integration: Automatic via Next.js

## Data Storage

**Databases:**
- **Supabase (PostgreSQL)** - Primary database
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`
  - Auth: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
  - Client libraries:
    - `@supabase/supabase-js` v2.84.0 (client-side)
    - `@supabase/ssr` v0.7.0 (server-side rendering auth)
  - Setup:
    - Server client: `lib/supabase/server.ts`
    - Browser client: `lib/supabase/client.ts`
    - Middleware: `lib/supabase/middleware.ts`
  - Tables:
    - `user_profiles` - User account information (name, avatar, DOB)
    - `ai_chat_sessions` - AI chat session metadata
    - `ai_chat_messages` - Individual messages in chat sessions
    - `plaid_items` - User's connected bank accounts (stores secret_id reference)
  - Security:
    - Uses Supabase Vault for Plaid access token storage
    - RPC functions: `store_plaid_token()`, `get_plaid_token()`, `delete_plaid_token()`
    - Access tokens never stored directly in database

**File Storage:**
- Local filesystem only - No external file storage detected

**Caching:**
- None detected - No Redis, Memcached, or other caching layer

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth** - Custom authentication
  - Implementation: Supabase built-in authentication
  - Features:
    - Session management via Supabase
    - User ID extraction from auth context
    - Post-signup redirect: `app/auth/callback/route.ts`
    - Post-signout redirect: `app/auth/signout/route.ts`
  - Pages:
    - `app/login/page.tsx` - Login page
    - `app/signup/page.tsx` - Signup page
    - `app/settings/profile/page.tsx` - Profile management

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or similar

**Logs:**
- Console logging only (`console.error()`, `console.log()`)
- Error handling in API routes returns user-friendly messages

**Performance:**
- Vercel Web Analytics for frontend performance metrics
- API route `maxDuration = 30` configured for timeout handling

## CI/CD & Deployment

**Hosting:**
- **Vercel** - Next.js deployment platform (implied)
- Environment: Supports multiple environments (sandbox, development, production)

**CI Pipeline:**
- Not detected - No GitHub Actions, CircleCI, or similar configuration

## Environment Configuration

**Required env vars:**

**Public (client-accessible):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_SITE_URL` - Frontend base URL (http://localhost:3000 for dev)

**Private (server-side only):**
- `PLAID_CLIENT_ID` - Plaid API client ID
- `PLAID_SECRET` - Plaid API secret key
- `PLAID_ENV` - Plaid environment selection
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude

**Secrets location:**
- Local development: `.env.local` (Git-ignored)
- Production: Vercel environment variables
- Plaid access tokens: Supabase Vault (RPC-protected retrieval)

## Webhooks & Callbacks

**Incoming:**
- `app/auth/callback/route.ts` - Supabase auth callback handler
- Plaid Link callbacks handled client-side via `react-plaid-link`

**Outgoing:**
- No outgoing webhooks detected
- No Plaid webhook subscriptions in current implementation

## Integration Flow Examples

**Bank Account Connection:**
1. User initiates bank connection via `components/plaid-link.tsx`
2. Frontend requests link token from `app/api/plaid/create-link-token/route.ts`
3. Plaid Link modal launched (`react-plaid-link`)
4. User authenticates with financial institution
5. Public token returned to frontend
6. Frontend sends public token to `app/api/plaid/exchange-public-token/route.ts`
7. Access token exchanged and stored in Supabase Vault
8. Account reference stored in `plaid_items` table

**AI Chat with Financial Context:**
1. User sends message via `app/ai/page.tsx`
2. Request sent to `app/api/ai/chat/route.ts`
3. Server verifies Supabase session
4. Financial context fetched via `lib/ai/financial-context.ts`:
   - Retrieves Plaid access token from Supabase Vault
   - Queries account balances via Plaid API
   - Queries recent transactions via Plaid API
   - Computes spending categories and summaries
5. System prompt generated with financial context
6. Claude API called with streaming enabled
7. Response streamed back to client
8. Message saved to `ai_chat_messages` table

---

*Integration audit: 2026-01-22*
