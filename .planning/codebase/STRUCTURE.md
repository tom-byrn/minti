# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
/Users/tombyrne/Desktop/Repos/minti/
├── app/                            # Next.js 16 app directory (file-based routing)
│   ├── layout.tsx                  # Root layout wrapper with global providers
│   ├── page.tsx                    # Home/dashboard page (/)
│   ├── login/                      # Login page route
│   │   └── page.tsx
│   ├── signup/                     # Signup page route
│   │   └── page.tsx
│   ├── ai/                         # AI assistant page route
│   │   └── page.tsx
│   ├── analytics/                  # Analytics page route
│   │   └── page.tsx
│   ├── accounts/                   # Bank accounts overview route
│   │   ├── page.tsx
│   │   └── [accountId]/            # Account details route (dynamic)
│   │       └── transactions/
│   │           └── page.tsx
│   ├── settings/                   # Settings pages route
│   │   ├── page.tsx
│   │   ├── profile/                # Profile settings page
│   │   │   └── page.tsx
│   │   ├── accounts/               # Account settings page
│   │   │   └── page.tsx
│   │   └── layout.tsx              # Settings layout wrapper
│   ├── auth/                       # Authentication route handlers
│   │   ├── callback/               # OAuth callback handler
│   │   │   └── route.ts
│   │   └── signout/                # Sign out handler
│   │       └── route.ts
│   └── api/                        # Backend API routes
│       ├── ai/                     # AI chatbot endpoints
│       │   ├── chat/               # Chat streaming endpoint
│       │   │   └── route.ts
│       │   └── sessions/           # Session management endpoints
│       │       ├── route.ts        # List, create sessions
│       │       └── [sessionId]/    # Modify, delete specific session
│       │           └── route.ts
│       └── plaid/                  # Plaid bank integration endpoints
│           ├── create-link-token/  # Generate Plaid Link token
│           │   └── route.ts
│           ├── exchange-public-token/  # Exchange public token for access token
│           │   └── route.ts
│           ├── balance/            # Fetch account balances
│           │   └── route.ts
│           ├── transactions/       # Fetch transaction history
│           │   └── route.ts
│           └── analytics/          # Fetch spending analytics
│               └── route.ts
├── components/                     # React components
│   ├── ui/                         # Shadcn/Radix UI primitive components
│   │   ├── button.tsx              # Button primitive
│   │   ├── card.tsx                # Card container
│   │   ├── dialog.tsx              # Modal dialog
│   │   ├── input.tsx               # Text input
│   │   ├── label.tsx               # Form label
│   │   ├── select.tsx              # Select dropdown
│   │   ├── sheet.tsx               # Sheet/drawer
│   │   ├── avatar.tsx              # User avatar
│   │   ├── badge.tsx               # Status badge
│   │   ├── table.tsx               # Data table
│   │   ├── chart.tsx               # Chart wrapper
│   │   ├── scroll-area.tsx         # Scrollable container
│   │   ├── dropdown-menu.tsx       # Dropdown menu
│   │   └── sonner.tsx              # Toast notification setup
│   ├── accounts-overview.tsx       # Dashboard: account balances display
│   ├── spending-chart.tsx          # Dashboard: spending visualization
│   ├── transactions-list.tsx       # Dashboard: recent transactions table
│   ├── dashboard-header.tsx        # Dashboard: top navigation bar
│   ├── ai-assistant-popup.tsx      # AI chat modal interface
│   ├── ai-popup-provider.tsx       # Context provider for AI popup
│   ├── plaid-link.tsx              # Bank connection UI component
│   ├── bank-connection-checker.tsx # Wrapper: shows reconnect prompt if no bank connection
│   ├── reconnect-bank-card.tsx     # Bank reconnection prompt card
│   └── markdown.tsx                # Markdown renderer (for AI chat)
├── hooks/                          # Custom React hooks
│   ├── use-ai-chat.ts              # Hook for AI chat session management
│   └── use-bank-connection.ts      # Hook for bank connection status
├── lib/                            # Shared utilities and services
│   ├── supabase/                   # Supabase authentication and database
│   │   ├── server.ts               # Server-side Supabase client factory
│   │   ├── client.ts               # Client-side Supabase client factory
│   │   └── middleware.ts           # Request middleware for session refresh
│   ├── ai/                         # AI integration logic
│   │   ├── financial-context.ts    # Fetch and format financial data for AI
│   │   └── system-prompt.ts        # Generate system prompts for Claude
│   ├── plaid.ts                    # Plaid API client singleton
│   ├── database.types.ts           # TypeScript types for database schema
│   ├── utils.ts                    # Utility functions (cn for class names)
│   └── settings-config.ts          # Application settings and constants
├── public/                         # Static assets
│   └── [favicon, logo, etc]
├── .planning/                      # GSD planning documents
│   └── codebase/                   # Codebase analysis markdown files
│       ├── ARCHITECTURE.md         # Architecture overview (this file)
│       └── STRUCTURE.md            # Directory structure guide
├── app/globals.css                 # Global CSS and Tailwind imports
├── .env.local                      # Environment variables (development)
├── .env.local.example              # Environment variable template
├── tsconfig.json                   # TypeScript configuration
├── next.config.ts                  # Next.js configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── postcss.config.mjs              # PostCSS configuration
├── eslint.config.mjs               # ESLint configuration
├── components.json                 # Shadcn/Radix component config
├── package.json                    # Project dependencies and scripts
├── pnpm-lock.yaml                  # pnpm lockfile
└── README.md                       # Project documentation
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js 16 file-based routing and server components
- Contains: Pages, layouts, API routes, authentication handlers
- Key files: `layout.tsx` (root wrapper), `page.tsx` (home), `api/` (backend routes)

**`app/api/`:**
- Purpose: Backend API endpoints for external integrations
- Contains: Plaid API handlers, AI chat handlers, session management
- Key files: `plaid/balance/route.ts`, `ai/chat/route.ts`, `ai/sessions/route.ts`

**`components/`:**
- Purpose: Reusable React components for UI
- Contains: UI primitives from Radix, feature components, layout components
- Key files: `accounts-overview.tsx` (balance display), `ai-assistant-popup.tsx` (chat UI), `plaid-link.tsx` (bank connection)

**`components/ui/`:**
- Purpose: Shadcn/Radix UI primitive components
- Contains: Buttons, inputs, dialogs, cards, tables, etc.
- Pattern: Imported from `@radix-ui/*` packages, wrapped with Tailwind styling

**`hooks/`:**
- Purpose: Custom React hooks for business logic
- Contains: Chat session management, bank connection status
- Key files: `use-ai-chat.ts` (chat state and API calls), `use-bank-connection.ts` (connection check)

**`lib/`:**
- Purpose: Shared services, utilities, and configuration
- Contains: Database clients, API integrations, type definitions
- Key files: `supabase/server.ts` (auth client), `ai/financial-context.ts` (data aggregation), `plaid.ts` (Plaid SDK)

**`lib/supabase/`:**
- Purpose: Supabase client initialization and session management
- Contains: Server and client client factories, middleware
- Key files: `server.ts` (server component client), `middleware.ts` (session refresh)

**`lib/ai/`:**
- Purpose: AI integration logic
- Contains: Financial data aggregation, system prompt generation
- Key files: `financial-context.ts` (fetches balance/transactions), `system-prompt.ts` (Claude prompt)

**`public/`:**
- Purpose: Static assets served directly by Next.js
- Contains: Favicon, logo, images, static files
- Generated: No, all committed

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout, initializes AIPopupProvider and Toaster
- `app/page.tsx`: Home/dashboard page, authenticates user, renders overview
- `app/auth/callback/route.ts`: OAuth callback handler

**Configuration:**
- `tsconfig.json`: TypeScript compiler options, path aliases (`@/*`)
- `next.config.ts`: Next.js build and runtime configuration
- `tailwind.config.js`: Tailwind CSS theme and plugin configuration
- `package.json`: Project dependencies and scripts
- `lib/database.types.ts`: Auto-generated Supabase database schema types

**Core Logic:**
- `lib/supabase/server.ts`: Creates authenticated Supabase client for server components
- `lib/plaid.ts`: Plaid API client configuration
- `lib/ai/financial-context.ts`: Aggregates financial data for AI personalization
- `hooks/use-ai-chat.ts`: Chat session and message state management

**API Routes:**
- `app/api/plaid/balance/route.ts`: Fetch account balances
- `app/api/plaid/transactions/route.ts`: Fetch transaction history
- `app/api/plaid/analytics/route.ts`: Fetch spending analytics
- `app/api/ai/chat/route.ts`: Stream AI chat responses
- `app/api/ai/sessions/route.ts`: List, create chat sessions

**Components:**
- `components/accounts-overview.tsx`: Displays total balance and account cards
- `components/spending-chart.tsx`: Visualizes monthly spending by category
- `components/transactions-list.tsx`: Lists recent transactions in table
- `components/ai-assistant-popup.tsx`: Chat interface with message history
- `components/plaid-link.tsx`: Bank connection UI via Plaid Link
- `components/bank-connection-checker.tsx`: Wrapper that shows reconnect prompt if no bank

**Testing:**
- No test files detected in current structure

## Naming Conventions

**Files:**
- React components: `kebab-case.tsx` (e.g., `accounts-overview.tsx`, `plaid-link.tsx`)
- API routes: `route.ts` in directory matching endpoint path (e.g., `app/api/plaid/balance/route.ts`)
- Pages: `page.tsx` in route directories (e.g., `app/accounts/page.tsx`)
- Layouts: `layout.tsx` in route directories (e.g., `app/settings/layout.tsx`)
- Utilities and services: `kebab-case.ts` (e.g., `financial-context.ts`, `plaid.ts`)
- Hooks: `use-camelCase.ts` (e.g., `use-ai-chat.ts`, `use-bank-connection.ts`)
- Types: `database.types.ts` for schema, inline types in other files

**Directories:**
- Feature pages: `kebab-case/` (e.g., `accounts/`, `settings/`, `ai/`)
- Dynamic routes: `[bracketCase]/` (e.g., `[accountId]/`, `[sessionId]/`)
- UI components: `ui/` for primitives, flat `components/` for feature components
- Services: `lib/supabase/`, `lib/ai/` for logical grouping
- Hooks: `hooks/` flat directory for all custom hooks

## Where to Add New Code

**New Feature (e.g., Budget Tracking):**
- Primary code: Create new API route at `app/api/[feature]/route.ts`
- Page: Create new page at `app/[feature]/page.tsx`
- Components: Create feature components at `components/[feature]-*.tsx`
- Services: Add business logic to `lib/[feature].ts` if needed
- Hooks: Add custom hook to `hooks/use-[feature].ts` if complex state
- Tests: Create test file at `app/[feature]/__tests__/page.test.tsx` (not currently in use)

**New Component (e.g., Button Variation):**
- Implementation: `components/[name].tsx` (kebab-case filename)
- If UI primitive: Place in `components/ui/[name].tsx`
- If feature component: Place in `components/[name].tsx` flat
- Import Radix primitives from `@radix-ui/react-*` packages
- Style with Tailwind classes using `cn()` utility from `lib/utils.ts`
- Export as default function component

**New API Integration (e.g., Email Service):**
- Route handler: `app/api/[service]/[action]/route.ts`
- Client initialization: `lib/[service].ts` (singleton pattern)
- Types: Inline in route file or add to `lib/database.types.ts` if database-related
- Environment variables: Add to `.env.local` and `.env.local.example`
- Usage: Import client from `lib/[service].ts`, use in route or service layer

**Utilities and Helpers:**
- Shared helpers: `lib/utils.ts` (global utilities like `cn()`)
- Service-specific utilities: Create new file in `lib/` (e.g., `lib/formatting.ts`)
- Component-specific utilities: Inline or small local util file in component directory
- Database types: Update auto-generated `lib/database.types.ts` from Supabase

## Special Directories

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes, by build process
- Committed: No, in .gitignore

**`node_modules/`:**
- Purpose: npm/pnpm dependencies
- Generated: Yes, by package manager
- Committed: No, in .gitignore

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: Partially (ARCHITECTURE.md, STRUCTURE.md generated by analysis tools)
- Committed: Yes, tracked in git

**`public/`:**
- Purpose: Static assets (favicon, logos, images)
- Generated: No, all committed
- Committed: Yes, publicly served

---

*Structure analysis: 2026-01-22*
