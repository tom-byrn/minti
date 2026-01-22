# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (e.g., `AccountsOverview.tsx`, `SpendingChart.tsx`)
- API routes: kebab-case directories with `route.ts` files (e.g., `/api/plaid/balance/route.ts`)
- Hooks: camelCase with `use-` prefix (e.g., `use-ai-chat.ts`, `use-bank-connection.ts`)
- Utilities: camelCase (e.g., `utils.ts`, `plaid.ts`, `financial-context.ts`)
- Interfaces/Types: PascalCase (e.g., `Account`, `PlaidTransaction`, `MonthlyData`, `FinancialSnapshot`)
- CSS classes: kebab-case via Tailwind (e.g., `flex items-center justify-between`)

**Functions:**
- Component functions: PascalCase (e.g., `AccountsOverview()`, `SpendingChart()`)
- Helper functions: camelCase (e.g., `processTransactions()`, `formatCategory()`, `getMessageContent()`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleSend()`, `handleInputChange()`, `handleSubmit()`)
- Hooks and async functions: camelCase (e.g., `fetchBalance()`, `fetchSessions()`, `loadSession()`)

**Variables:**
- State variables: camelCase (e.g., `accounts`, `loading`, `error`, `isLoading`, `currentSessionId`)
- Constants: UPPER_SNAKE_CASE for module-level constants (e.g., `CLAUDE_MODEL_NAME`, `categoryIcons`)
- Private variables: camelCase with underscore prefix not used; instead rely on scope/closures

**Types:**
- Interface definitions: PascalCase, singular noun (e.g., `interface Account`, `interface PlaidTransaction`)
- Type aliases: PascalCase (e.g., `type UIMessage`, `type ClassValue`)
- Generic type parameters: Single uppercase letter when simple (e.g., `T`), PascalCase when semantic

## Code Style

**Formatting:**
- No explicit prettier config found; inferred from codebase:
  - 2-space indentation
  - Semicolons at end of statements
  - Single quotes for JS strings, double quotes for JSX attributes
  - Consistent spacing around operators and after commas

**Linting:**
- ESLint configured via `eslint.config.mjs` at project root
- Uses `eslint-config-next/core-web-vitals` for Next.js core web vitals
- Uses `eslint-config-next/typescript` for TypeScript support
- Run with: `npm run lint` (maps to `eslint .`)

## Import Organization

**Order:**
1. External library imports (`react`, `next`, third-party packages)
2. Internal absolute imports using `@/` path alias
3. Local relative imports (rarely used; prefer `@/`)

**Example pattern from codebase:**
```typescript
import { useEffect, useState, useCallback } from "react"
import { CreditCard, DollarSign, TrendingUp, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ReconnectBankCard } from "@/components/reconnect-bank-card"
```

**Path Aliases:**
- `@/*` maps to project root in `tsconfig.json`
- Used consistently for all internal imports across components, lib, hooks, app

## Error Handling

**Patterns:**
- Try-catch blocks with specific error logging via `console.error()` with context
- Descriptive error messages returned to client (e.g., "Your bank connection has expired", "Failed to fetch balance")
- User-facing errors are generic to avoid leaking sensitive information
- Supabase errors checked via `error` property: `if (error || !data) { return error }`
- HTTP status codes used meaningfully: 401 for unauthorized, 404 for not found, 500 for server errors
- No custom error classes; errors logged to console and generic messages returned

**Example from `/app/api/plaid/balance/route.ts`:**
```typescript
try {
  // ... fetch logic
} catch (error) {
  console.error('Error fetching balance:', error)
  return NextResponse.json(
    { error: 'Failed to fetch balance' },
    { status: 500 }
  )
}
```

## Logging

**Framework:** `console` object (console.error, console.log)

**Patterns:**
- Error logging: `console.error('descriptive context:', error)` at the point of failure
- No debug logging in production code
- Errors logged with context string describing the operation
- No structured logging framework (Sentry, etc.) detected

**When to log:**
- API route errors with context
- Failed async operations (fetch, database queries)
- User action callbacks that could fail

## Comments

**When to Comment:**
- Minimal inline comments; code should be self-documenting
- Comments used for non-obvious business logic (e.g., Plaid amount sign convention)
- Complex calculations explained with context
- Example from `/components/spending-chart.tsx`:
  ```typescript
  // Plaid: positive amount = money leaving account (spending)
  // Plaid: negative amount = money entering account (income)
  ```

**JSDoc/TSDoc:**
- Not used extensively
- Interface properties documented inline via optional property names and types
- Function parameters typed via TypeScript, reducing need for JSDoc

## Function Design

**Size:**
- Component functions: typically 50-200 lines, break into sub-components if exceeding 200 lines
- Helper functions: 10-50 lines; extract if logic is reused or complex
- API handlers: 30-70 lines with clear try-catch structure

**Parameters:**
- Typed via TypeScript interfaces/types
- Destructuring used for objects to improve readability
- React hooks use dependency arrays; missing dependencies flagged by ESLint

**Return Values:**
- Components: JSX elements or null
- Async functions: Promises with typed resolved values
- API routes: NextResponse or Response objects with typed JSON payloads
- Early returns used to handle error/edge cases

## Module Design

**Exports:**
- Named exports for utilities and helpers (e.g., `export function cn()`, `export async function getFinancialContext()`)
- Default exports for React components in component files
- Type exports: `export type UserProfile =`, `export interface SettingsNavItem`

**Barrel Files:**
- Used minimally; direct imports from specific files preferred
- No barrel re-exports detected in `/components/index.ts` or similar

## React Patterns

**Hooks:**
- Functional components with hooks (useState, useEffect, useCallback, useRef)
- Custom hooks extracted to `/hooks/` directory
- useCallback used to memoize event handlers and callbacks
- useEffect with proper dependency arrays

**Client vs Server:**
- "use client" directive at top of client components
- Server-side logic in `/app/api/` routes
- Supabase client created via `createClient()` with proper async handling

**Component Structure:**
- Interface definitions at top of file
- Component function declaration after interfaces
- Props interface optional; used when component has multiple props
- State initialized before event handlers

---

*Convention analysis: 2026-01-22*
