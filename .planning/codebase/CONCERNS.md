# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

**Lack of Middleware Protection for API Routes:**
- Issue: Multiple API routes lack middleware-enforced authentication. Each route manually validates user authentication instead of using a centralized auth guard.
- Files: `app/api/plaid/balance/route.ts`, `app/api/plaid/transactions/route.ts`, `app/api/plaid/analytics/route.ts`, `app/api/ai/chat/route.ts`, `app/api/ai/sessions/route.ts`
- Impact: Repetitive authentication code (22 instances of `supabase.auth.getUser()` across API routes). Increases risk of missing auth checks in future endpoints. Middleware pattern exists in `lib/supabase/middleware.ts` but is unused.
- Fix approach: Create a protected route wrapper or use Next.js middleware at `middleware.ts` (root level) to enforce auth before routes execute. Update `lib/supabase/middleware.ts` to be properly integrated into Next.js middleware chain.

**Untyped `any` Usage:**
- Issue: Multiple files use implicit `any` types in type definitions, reducing type safety.
- Files: `app/accounts/page.tsx` (line 76: `icon: any`, line 81: `Record<string, any>`), `app/accounts/[accountId]/transactions/page.tsx` (similar patterns)
- Impact: Loss of type checking for icon mappings and category handlers. Potential for runtime errors if category data structure changes.
- Fix approach: Create proper TypeScript types for category icons mapping. Replace `any` with specific union types of lucide-react icon components.

**Error Responses Expose Generic Messages:**
- Issue: API error responses are intentionally vague to avoid leaking information, but this prevents frontend debugging. Backend logs contain full error details but are scattered via `console.error()`.
- Files: All files in `app/api/**`, 22 instances of `console.error()` across the codebase
- Impact: Difficult to diagnose production issues. Console errors are not persisted or aggregated.
- Fix approach: Implement structured logging (e.g., winston or pino) with error tracking. Keep generic client messages while preserving detailed server-side logs.

**Hardcoded AI Model Name:**
- Issue: Claude model version hardcoded as string in route handler.
- Files: `app/api/ai/chat/route.ts` (line 9: `const CLAUDE_MODEL_NAME = 'claude-haiku-4-5-20251001'`)
- Impact: Requires code change and redeployment to upgrade model versions. Makes A/B testing different models difficult.
- Fix approach: Move to environment variable or feature flag system. Allow runtime model selection.

**No Rate Limiting on API Endpoints:**
- Issue: All API endpoints accept unlimited requests with no rate limiting implemented.
- Files: `app/api/ai/chat/route.ts`, `app/api/ai/sessions/route.ts`, `app/api/plaid/balance/route.ts`, `app/api/plaid/transactions/route.ts`, `app/api/plaid/analytics/route.ts`
- Impact: Vulnerable to abuse. Expensive Plaid API calls (balance, transactions, analytics) could be triggered repeatedly, incurring unexpected costs.
- Fix approach: Implement rate limiting middleware using packages like `@vercel/rate-limit` or custom Redis-based solution. Add per-user request quotas.

## Security Considerations

**Plaid Tokens Stored in Vault but Access Not Audited:**
- Risk: Access token retrieval via `get_plaid_token` RPC is not logged or audited. Multiple concurrent calls to this function have no rate limiting.
- Files: `app/api/plaid/balance/route.ts` (line 33-35), `app/api/plaid/transactions/route.ts` (line 33-35), `lib/ai/financial-context.ts` (line 39-42)
- Current mitigation: Tokens stored in Supabase Vault instead of app database. User ID checked before token retrieval.
- Recommendations: Add Supabase audit logging to track who accessed which secrets and when. Implement token rotation policy. Log all vault access attempts server-side.

**User ID Trusting Without Additional Validation:**
- Risk: After `supabase.auth.getUser()` confirms identity, app assumes the user ID in the response is trustworthy without additional validation.
- Files: All API routes that use `user.id`
- Current mitigation: Supabase JWT token validation happens before route execution
- Recommendations: Consider adding additional session validation in middleware. Log all sensitive data access attempts.

**AI Chat Includes Financial Data in System Prompt:**
- Risk: User's complete financial snapshot (account balances, transaction history, spending categories) is included in system prompt sent to Claude API.
- Files: `lib/ai/system-prompt.ts` (lines 23-29), `app/api/ai/chat/route.ts` (line 88)
- Current mitigation: System prompt includes disclaimers about not providing investment/tax advice. Financial context only generated if accounts are connected.
- Recommendations: Implement data redaction for sensitive fields (mask full account numbers, exact balances). Consider client-side aggregation instead of exposing granular data to external AI. Add user consent checkbox for sending financial data to external AI services.

**Public Supabase Keys Used in Browser:**
- Risk: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are intentionally public (Supabase design), but this exposes your Supabase project identity and allows direct API calls.
- Files: `lib/supabase/client.ts`, `app/layout.tsx` (via Analytics which may collect data)
- Current mitigation: Row-Level Security (RLS) policies should enforce data access. ANON_KEY has limited permissions.
- Recommendations: Verify RLS policies on `ai_chat_sessions`, `ai_chat_messages`, `plaid_items`, `user_profiles` tables. Test that unauthenticated users cannot access other users' data. Monitor for direct API calls from unknown sources.

## Performance Bottlenecks

**Financial Context Fetches 500 Transactions Every AI Message:**
- Problem: When users ask AI questions, `getFinancialContext()` is called, which fetches 500 transactions from Plaid to calculate month-to-date statistics.
- Files: `lib/ai/financial-context.ts` (lines 66-74), `app/api/ai/chat/route.ts` (line 87)
- Cause: No caching. Every message triggers a full Plaid API call. Transactions data rarely changes within a single chat session.
- Improvement path: Implement caching with TTL (e.g., cache financial context for 5 minutes per user). Use Supabase Redis or application-level cache. Only refresh on explicit user action (refresh button).

**Transaction Fetching Hard-Limited to 100 Items:**
- Problem: Balance and transactions endpoints fetch only 100 items, then stop. If user has more transactions in the period, they're lost.
- Files: `app/api/plaid/balance/route.ts` (line 45), `app/api/plaid/transactions/route.ts` (line 56)
- Cause: Plaid pagination not implemented. Code uses hardcoded `offset: 0, count: 100`.
- Improvement path: Implement pagination loop to fetch all transactions. Store complete transaction history in local database instead of querying Plaid on every page load.

**Large Component Files:**
- Problem: Some page components are 600+ lines with mixed concerns (data fetching, state management, rendering).
- Files: `app/accounts/page.tsx` (644 lines), `app/accounts/[accountId]/transactions/page.tsx` (599 lines), `app/analytics/page.tsx` (508 lines)
- Cause: No component extraction or custom hooks for large features
- Improvement path: Extract data-fetching logic into custom hooks. Break large components into smaller, reusable sub-components.

**Inefficient Date Calculations in Analytics:**
- Problem: Analytics endpoint recalculates spending trends for every request by iterating through transaction array in loops.
- Files: `app/api/plaid/analytics/route.ts` (lines 127-150)
- Cause: No pre-computed analytics. Loop runs on every request.
- Improvement path: Pre-compute daily/weekly aggregates when transactions are fetched. Store in database. Update only on new transactions.

## Fragile Areas

**AI Message Format Conversion:**
- Files: `app/api/ai/chat/route.ts` (lines 11-23, 81-84), `hooks/use-ai-chat.ts` (lines 22-30)
- Why fragile: Code handles both old `content` format and new `parts` format from AI SDK. Logic is duplicated across multiple files. If SDK changes message format again, multiple places need updates.
- Safe modification: Extract message format handling into a utility module `lib/ai/message-utils.ts`. Create version-agnostic message converter. Test with both formats.
- Test coverage: No tests visible for message format conversion. Unknown if both old and new formats actually work.

**Session-Message Relationship:**
- Files: `app/api/ai/sessions/[sessionId]/route.ts` (lines 21-37), `app/api/ai/chat/route.ts` (lines 61-72, 95-102)
- Why fragile: Session ID is passed from frontend, but not validated to exist before being used. Messages are inserted without checking if session still exists. No transaction logic.
- Safe modification: Wrap session existence check and message insert in a database transaction. Verify session belongs to user before any message operations.
- Test coverage: No visible tests for race conditions (e.g., session deleted between message fetch and insert).

**Plaid Token Retrieval with No Fallback:**
- Files: `app/api/plaid/balance/route.ts` (lines 20-36), `app/api/plaid/transactions/route.ts` (lines 20-36)
- Why fragile: Code takes first Plaid item from query (`plaidItems[0]`) without checking if user has multiple items or if the item is still valid. If vault returns null, entire request fails.
- Safe modification: Allow user to select which account to query. Check token freshness before using. Implement retry logic for transient vault failures.
- Test coverage: Unknown if tested with multiple connected accounts or with expired tokens.

**Financial Context Null Handling:**
- Files: `lib/ai/system-prompt.ts` (lines 23-34), `app/api/ai/chat/route.ts` (line 87)
- Why fragile: If `getFinancialContext()` returns null (no accounts connected, vault error, etc.), system prompt changes. AI behavior may differ significantly based on whether context is available.
- Safe modification: Always populate context with at least a baseline state (e.g., "No accounts connected"). Ensure AI behavior is consistent whether context exists or not. Add logging to track how often context retrieval fails.
- Test coverage: No visible tests for error scenarios.

## Scaling Limits

**Supabase Vault Single Request at a Time:**
- Current capacity: Unknown. Supabase Vault RPC calls are sequential.
- Limit: If multiple requests hit the same endpoint and all need to fetch Plaid tokens, Vault becomes a bottleneck. No connection pooling visible.
- Scaling path: Implement token caching at application layer (Redis or in-memory). Batch vault requests where possible. Monitor Supabase function performance.

**Plaid API Rate Limits Not Enforced Locally:**
- Current capacity: Plaid sandbox/development has low rate limits (typically 10 requests/minute per endpoint)
- Limit: App makes no effort to stay within Plaid limits. Multiple balance/transaction/analytics calls can exhaust quota.
- Scaling path: Implement client-side rate limiting and queuing. Track Plaid request count. Show "too many requests" UI before Plaid returns 429.

**Database Schema Incomplete:**
- Current capacity: Schema has `ai_chat_sessions`, `ai_chat_messages`, `user_profiles`, but no `plaid_items` in types.
- Limit: `plaid_items` table is used in production but not documented in `lib/database.types.ts`. Missing fields like `secret_id`, `item_id`, `institution_name`.
- Scaling path: Update `database.types.ts` to include all tables used. Use Supabase type generation (`supabase gen types`). Document all schema relationships.

## Missing Critical Features

**No Offline/Local Data Cache:**
- Problem: App fetches all data on-demand from external APIs (Supabase, Plaid). No offline functionality. If user loses connection mid-transaction, they get errors.
- Blocks: Offline-first applications. Poor UX on poor connections.

**No Transaction History Persistence:**
- Problem: Transactions are fetched fresh from Plaid on every page load. No local database of transactions.
- Blocks: Can't query user's full transaction history. Can't detect changes/new transactions. Can't handle pagination efficiently.

**No Audit Trail for Financial Data Access:**
- Problem: No log of which endpoints accessed which financial data, at what time, by which user.
- Blocks: Compliance requirements. Detecting unauthorized access patterns. Debugging data sync issues.

**No Testing Infrastructure:**
- Problem: No test files found in codebase. No Jest/Vitest config.
- Blocks: Confidence in refactoring. Ability to catch regressions. Type safety enforcement.

## Test Coverage Gaps

**API Route Error Scenarios:**
- What's not tested:
  - Plaid API returns errors (PRODUCT_NOT_READY, INVALID_REQUEST, etc.)
  - Supabase vault returns null or error
  - User tries to access another user's session
  - Request with invalid/missing JSON body
- Files: `app/api/**/*.ts`
- Risk: Unhandled error states could expose system internals or cause crashes
- Priority: High

**AI Chat Message Flow:**
- What's not tested:
  - Message persistence (are all messages actually saved to DB?)
  - Session lifecycle (create, load, delete, update)
  - Message format conversion between client and server
  - Streaming response completion and database write
- Files: `app/api/ai/chat/route.ts`, `hooks/use-ai-chat.ts`
- Risk: Chat history could be corrupted, lost, or inaccessible
- Priority: High

**Financial Data Accuracy:**
- What's not tested:
  - Analytics spending calculations with edge cases (negative amounts, transfers)
  - Category mapping (do all Plaid categories map correctly?)
  - Date range filtering (off-by-one errors in date boundaries)
  - Income vs. spending classification (positive vs. negative amounts)
- Files: `lib/ai/financial-context.ts`, `app/api/plaid/analytics/route.ts`
- Risk: Users see incorrect spending/income/balance figures, leading to poor financial decisions
- Priority: High

**Plaid Token Exchange Security:**
- What's not tested:
  - Token exchange with invalid public tokens
  - Token stored in vault successfully but DB write fails (should clean up)
  - Multiple account connections for same user
  - Account disconnection/re-connection flow
- Files: `app/api/plaid/exchange-public-token/route.ts`
- Risk: Tokens could be leaked, orphaned, or duplicated
- Priority: High

**UI State Management:**
- What's not tested:
  - Loading states (do they show/hide correctly?)
  - Error states (do error messages display accurately?)
  - Long transaction lists (pagination? infinite scroll?)
  - Form validation (all inputs validate as expected?)
- Files: Page components, mostly manual testing
- Risk: Poor UX, hidden bugs in edge cases
- Priority: Medium

---

*Concerns audit: 2026-01-22*
