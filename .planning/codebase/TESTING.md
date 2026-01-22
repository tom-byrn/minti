# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Status:** Not detected in codebase

**Finding:** No test framework is configured or in use. No `jest.config.*`, `vitest.config.*`, or testing dependencies found in `package.json`. No `*.test.*` or `*.spec.*` files found in the codebase.

**Implication:** The project currently has zero test coverage. Tests must be implemented from scratch if testing is added as a requirement.

## Run Commands

```bash
# No test command exists
# Linting (only quality check available):
npm run lint              # Run ESLint on codebase
```

## Test File Organization

**Not applicable** - No testing framework configured

**If tests were to be added, recommended structure:**
- Co-locate test files with source: `components/button.tsx` + `components/button.test.tsx`
- Or separate `__tests__` directory per module
- API route tests in `/app/api/__tests__/`
- Hook tests in `/hooks/__tests__/`

## Test Structure

**Not applicable** - No testing framework in use

**Recommended patterns based on codebase:**

For a component like `AccountsOverview.tsx`, a test would likely follow:
```typescript
// NOT currently in codebase, but recommended structure:
describe('AccountsOverview', () => {
  it('should display loading state while fetching', () => {
    // Test setup
  })

  it('should show reconnect card when no accounts connected', () => {
    // Test setup
  })
})
```

For an API route like `/app/api/plaid/balance/route.ts`:
```typescript
describe('POST /api/plaid/balance', () => {
  it('should return 401 when user not authenticated', () => {
    // Mock supabase.auth.getUser() to return null
  })

  it('should return 404 when no connected accounts', () => {
    // Mock empty plaid_items response
  })
})
```

## Mocking

**Not applicable** - No testing framework configured

**Recommended mocking patterns based on codebase:**

For Supabase mocking:
```typescript
// Would mock supabase client methods:
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  }))
}))
```

For Plaid API mocking:
```typescript
jest.mock('@/lib/plaid', () => ({
  plaidClient: {
    accountsBalanceGet: jest.fn(),
    transactionsGet: jest.fn(),
  }
}))
```

For fetch mocking:
```typescript
global.fetch = jest.fn((url) => {
  if (url === '/api/plaid/balance') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ accounts: [], totalBalance: 0 })
    })
  }
})
```

## Fixtures and Test Data

**Not applicable** - No testing framework configured

**What should be mocked:**
- External API calls (Plaid, Supabase)
- Network requests (fetch)
- Timers (setTimeout in components)
- Authentication state

**What should NOT be mocked:**
- React internals
- Component render logic (test actual rendered output)
- Pure utility functions (test actual behavior)
- Date/time logic (unless testing relative time)

## Coverage

**Requirements:** None enforced

**Current Status:** 0% - No tests present

**If implemented, target coverage:**
- Critical paths (authentication, data fetching): 100%
- UI components: 80%+
- Utilities and helpers: 100%

## Test Types

**Unit Tests:**
Not implemented. Would scope to:
- Helper functions: `processTransactions()`, `formatCategory()`, `formatDate()`
- Utility functions: `cn()` from utils
- Data formatting functions in components

**Integration Tests:**
Not implemented. Would scope to:
- API routes with mocked Supabase and Plaid
- Component data fetching flows
- Session creation and management

**E2E Tests:**
Not implemented. No E2E framework configured (Playwright, Cypress, etc.).

Would test:
- User login flow via Supabase auth
- Plaid connection and account linking
- Transaction viewing and filtering
- AI chat interactions

## Async Testing

**Not applicable** - No framework configured

**When implemented, pattern would be:**
```typescript
// For async operations in tests:
test('should fetch and display accounts', async () => {
  render(<AccountsOverview />)

  // Simulate API response
  const data = await screen.findByText('Total Balance')
  expect(data).toBeInTheDocument()
})
```

## Error Testing

**Not applicable** - No framework configured

**When implemented, recommended pattern:**
```typescript
test('should show error message on failed fetch', async () => {
  // Mock fetch to reject
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

  render(<AccountsOverview />)

  const error = await screen.findByText(/failed to connect/i)
  expect(error).toBeInTheDocument()
})
```

## Current Testing Gaps

**Critical areas without tests:**
1. **API Routes:** All 10 API routes have zero coverage
   - `/api/plaid/balance` - No tests for balance fetch
   - `/api/plaid/transactions` - No tests for transaction fetch
   - `/api/ai/chat` - No tests for chat streaming
   - `/api/ai/sessions/*` - No tests for session management

2. **Components:** All 25+ components lack tests
   - `AccountsOverview` - Complex data fetching and state management
   - `SpendingChart` - Data processing and chart rendering
   - `TransactionsList` - List rendering with filtering
   - `AIAssistant` - Chat UI interaction

3. **Hooks:** No tests for custom hooks
   - `useAIChat` - Complex session and message management (250 lines)
   - `useBankConnection` - Bank connection state

4. **Business Logic:** Data processing functions untested
   - `processTransactions()` - Financial data aggregation
   - `getFinancialContext()` - Complex API orchestration
   - Category mapping and icon assignment

5. **Authentication:** No tests for auth flows
   - Supabase auth integration
   - Protected route access

## Priority for Test Implementation

**High Priority:**
1. API routes with external dependencies (Plaid, Supabase)
2. Data transformation functions (processTransactions, formatters)
3. Custom hooks with complex logic (useAIChat with 250 lines)
4. Authentication flows

**Medium Priority:**
1. Core UI components (AccountsOverview, SpendingChart, TransactionsList)
2. Form components
3. Error handling and edge cases

**Low Priority:**
1. Simple presentational components (badges, buttons)
2. UI-only interactions
3. Layout components

---

*Testing analysis: 2026-01-22*
