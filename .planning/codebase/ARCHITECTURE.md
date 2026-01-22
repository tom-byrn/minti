# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Full-stack Next.js application with layered client-server architecture.

**Key Characteristics:**
- Server Components for data fetching and authentication (app directory pattern)
- Client Components for interactive UI and state management
- API routes for external service integrations (Plaid, Anthropic)
- Real-time messaging with streaming responses
- Separate concerns: UI layer, API layer, service layer, data layer

## Layers

**Presentation Layer (Client Components):**
- Purpose: Interactive UI components, form handling, client-side state
- Location: `components/` directory and nested component files in `app/`
- Contains: React components, hooks for UI logic, client-side forms
- Depends on: Server API routes, utilities, UI component library (Radix UI)
- Used by: Browser clients for rendering interactive interfaces

**Server Component Layer (Page Routes):**
- Purpose: Server-side data fetching, authentication checks, layout management
- Location: `app/` directory (layout.tsx, page.tsx files, auth routes)
- Contains: Async server components, direct database queries, session management
- Depends on: Supabase client (server-side), library utilities
- Used by: Browser for rendering initial page state

**API Route Layer (Backend):**
- Purpose: Handle external API integrations and data operations
- Location: `app/api/` subdirectories (plaid, ai)
- Contains: Route handlers (POST, GET, PATCH, DELETE), validation, error handling
- Depends on: Supabase client (server), external SDKs (Plaid, Anthropic AI)
- Used by: Client components via fetch calls

**Service/Business Logic Layer:**
- Purpose: Encapsulate domain logic for financial data and AI interactions
- Location: `lib/` directory
- Contains: Financial context extraction, AI prompts, Plaid client configuration, Supabase clients
- Depends on: External SDKs, database types
- Used by: API routes and server components

**Data Access Layer:**
- Purpose: Database interactions and type safety
- Location: `lib/supabase/`, `lib/database.types.ts`
- Contains: Supabase client initialization, authentication middleware, TypeScript database types
- Depends on: Supabase SDK
- Used by: All server-side code for database queries

**Utility Layer:**
- Purpose: Shared functions and constants
- Location: `lib/utils.ts`, `lib/settings-config.ts`
- Contains: cn() utility for CSS classes, application configuration
- Depends on: Third-party utilities (clsx, tailwind-merge)
- Used by: Components and pages throughout application

## Data Flow

**Dashboard View Flow:**

1. Browser requests `/` (home page)
2. `app/page.tsx` executes as server component
3. Creates Supabase client via `createClient()` from `lib/supabase/server.ts`
4. Queries authentication and user profile from `user_profiles` table
5. Redirects to `/login` if not authenticated
6. Renders layout with child components (`DashboardHeader`, `AccountsOverview`, `SpendingChart`, `TransactionsList`)
7. Client components in rendered tree fetch additional data:
   - `AccountsOverview` calls `POST /api/plaid/balance` to fetch account balances
   - `TransactionsList` calls `POST /api/plaid/transactions` for transaction history
   - `SpendingChart` queries analytics data via `POST /api/plaid/analytics`
8. Components update local state with fetched data and re-render

**AI Chat Flow:**

1. User opens AI chat modal via `AIPopupProvider` component
2. Client calls `useAIChat()` hook from `hooks/use-ai-chat.ts`
3. Hook fetches existing sessions from `GET /api/ai/sessions`
4. On first message, creates new session via `POST /api/ai/sessions`
5. User message sent to `POST /api/ai/chat` route
6. Route handler (`app/api/ai/chat/route.ts`):
   - Authenticates user via Supabase
   - Retrieves financial context via `getFinancialContext()` which:
     - Fetches user's Plaid secret ID from `plaid_items` table
     - Retrieves access token from Supabase Vault
     - Calls Plaid API for account balances and transactions
     - Aggregates data into readable format
   - Passes context as system prompt to Claude via Anthropic SDK
   - Streams response back to client
   - Saves conversation to `ai_chat_messages` and `ai_chat_sessions` tables
7. Client displays streamed response in real-time
8. Session is updated with new message timestamps

**Plaid Bank Connection Flow:**

1. User clicks bank connection button
2. `PlaidLink` component initializes with link token from `POST /api/plaid/create-link-token`
3. Plaid Link modal opens for bank selection and authentication
4. User completes bank linking in Plaid
5. `PlaidLink` receives success callback with public token
6. Component calls `POST /api/plaid/exchange-public-token`
7. Route handler exchanges public token for access token
8. Access token securely stored in Supabase Vault via RPC function
9. Plaid item details (secret_id, institution_id) saved to `plaid_items` table
10. `AccountsOverview` component refetches balance data, displays newly connected accounts

**State Management:**

- Authentication: Managed by Supabase Auth (session in cookies via middleware)
- Page-level state: Server components fetch data at request time
- Client state: Component-level useState for UI interactions, form inputs
- API response caching: Browser cache for GET requests
- Global context: `AIPopupProvider` manages AI popup visibility across app

## Key Abstractions

**Supabase Client Factory:**
- Purpose: Create and configure authenticated Supabase clients for server and client contexts
- Examples: `lib/supabase/server.ts`, `lib/supabase/client.ts`
- Pattern: Async factory function that handles cookie management and authentication setup

**Financial Context Generator:**
- Purpose: Aggregate real-time financial data from Plaid for AI personalization
- Examples: `lib/ai/financial-context.ts`
- Pattern: Async function that orchestrates multiple Plaid API calls and formats response

**AI Chat Transport:**
- Purpose: Handle bidirectional communication between client UI and AI API route
- Examples: `TextStreamChatTransport` from `@ai-sdk/react`
- Pattern: Wraps streaming HTTP requests with session ID management

**Plaid Client Singleton:**
- Purpose: Centralized Plaid API client with shared configuration
- Examples: `lib/plaid.ts`
- Pattern: Exported singleton instance used by all Plaid API routes

**Component Composition:**
- Purpose: Build pages from reusable dashboard sections
- Examples: `DashboardHeader`, `AccountsOverview`, `SpendingChart`, `TransactionsList`
- Pattern: Client components that fetch their own data and manage local state

## Entry Points

**Web Application:**
- Location: `app/layout.tsx`
- Triggers: Browser navigation to domain
- Responsibilities: Initialize global providers (`AIPopupProvider`, `Toaster`), set metadata, wrap all pages

**Home/Dashboard:**
- Location: `app/page.tsx`
- Triggers: User navigates to `/` after authentication
- Responsibilities: Check authentication, fetch user profile, render dashboard layout and overview components

**Authentication Callback:**
- Location: `app/auth/callback/route.ts`
- Triggers: Supabase OAuth redirect with authorization code
- Responsibilities: Exchange code for session, verify token, redirect to authenticated page

**API: Plaid Balance:**
- Location: `app/api/plaid/balance/route.ts`
- Triggers: `AccountsOverview` component calls `POST /api/plaid/balance`
- Responsibilities: Authenticate user, retrieve Plaid access token, fetch account balances

**API: AI Chat:**
- Location: `app/api/ai/chat/route.ts`
- Triggers: User sends message in AI chat interface
- Responsibilities: Validate session, fetch financial context, stream AI response, persist messages

**API: AI Sessions:**
- Location: `app/api/ai/sessions/route.ts`, `app/api/ai/sessions/[sessionId]/route.ts`
- Triggers: Client requests chat session list, creates new session, modifies/deletes session
- Responsibilities: CRUD operations on chat sessions and history

**Login Page:**
- Location: `app/login/page.tsx`
- Triggers: User navigates to `/login` or is redirected by auth guard
- Responsibilities: Display authentication UI, handle signup/login forms

## Error Handling

**Strategy:** Graceful degradation with user-facing error messages

**Patterns:**

- **API Errors:** Try-catch in route handlers, return appropriate HTTP status codes (401 Unauthorized, 404 Not Found, 500 Internal Server Error)
- **Component Data Loading:** Error state in useState, display error message UI, provide retry button
- **Missing Bank Connection:** `BankConnectionChecker` wrapper component shows reconnection prompt instead of data
- **Session Validation:** Return 404 if chat session doesn't belong to user
- **Field Validation:** Form validation via react-hook-form and Zod schema validation
- **Logging:** Console.error in try-catch blocks, status codes indicate severity to client

Examples:
- `app/api/plaid/balance/route.ts`: Returns 404 if no Plaid items, 401 if not authenticated
- `components/accounts-overview.tsx`: Catches fetch errors, sets error state, displays error message
- `app/api/ai/chat/route.ts`: Returns 401 if user not authenticated, 404 if session invalid

## Cross-Cutting Concerns

**Logging:** Console.log/console.error in development, errors logged at entry points (API routes) for server-side visibility

**Validation:**
- Form validation via react-hook-form in client components
- Zod schemas for request/response shape validation
- Authentication checks in every API route via Supabase getUser()
- Session ownership checks before allowing access to user data

**Authentication:**
- Supabase Auth handles OAuth flow and session management
- Server middleware in `lib/supabase/middleware.ts` refreshes session before request
- Every API route starts with `await createClient()` and `getUser()` check
- Unauthenticated users redirected to `/login`
- Session state persisted in HTTP-only cookies (handled by Supabase SSR package)

---

*Architecture analysis: 2026-01-22*
