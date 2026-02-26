# Feature Proposal: Weekly Financial Digest & Smart Alerts

## The Problem

Minti currently provides excellent tools for users to *actively* check their finances — dashboards, analytics, budgets, goals, and an AI assistant. But the app is entirely **reactive**: users only get value when they open it and look. There's no proactive layer that surfaces timely, actionable insights without user effort.

This means:
- A user might overshoot their grocery budget by Tuesday and not realize it until the following week
- An annual subscription could renew silently at a higher rate
- A goal deadline could be approaching with the user off-track
- Unusual spending patterns (e.g., a sudden spike in dining out) go unnoticed

## The Proposal: Weekly Digest + Smart Alerts

Add a **Financial Digest** page and an **in-app alert system** that proactively surfaces insights by combining data from every existing feature (transactions, budgets, goals, subscriptions, AI).

### Part 1: Smart Alerts (In-App Notifications)

A lightweight notification system that generates alerts based on rules applied to the user's real financial data. Alerts appear as a bell icon badge in the header and in a dropdown/panel.

**Alert types:**

| Alert | Trigger | Priority |
|---|---|---|
| Budget warning | Spent 80%+ of a category budget | High |
| Budget exceeded | Spent 100%+ of a category budget | High |
| Subscription renewal | Subscription charge expected in next 3 days | Medium |
| Subscription price change | Detected amount differs from previous charge | High |
| Goal at risk | Goal deadline within 30 days and < 80% funded | Medium |
| Goal achieved | Goal reaches 100% of target | Low (celebratory) |
| Unusual spending | Daily spend > 2x the user's rolling average | High |
| Income received | Large deposit detected | Low (informational) |
| Savings rate drop | Weekly savings rate drops below user's target | Medium |

**Implementation approach:**
- Add an `alerts` table in Supabase with columns: `id`, `user_id`, `type`, `title`, `message`, `priority`, `read`, `data` (JSONB for context), `created_at`
- Create an `/api/alerts/generate` endpoint that runs alert rules against current data
- Trigger alert generation on page load (debounced) or via a cron-like mechanism
- Add a `<NotificationBell />` component in the dashboard header showing unread count
- Add a notification dropdown/panel to view, dismiss, and act on alerts
- Each alert can deep-link to the relevant page (e.g., "Budget exceeded for Dining" links to `/budget`)

### Part 2: Weekly Financial Digest

A dedicated `/digest` page that generates a comprehensive weekly summary of the user's financial activity, powered by the existing AI assistant infrastructure.

**Digest sections:**

1. **Week at a Glance** — Total spent, total earned, net change, compared to previous week
2. **Budget Scorecard** — Which budgets are on track (green), at risk (yellow), or exceeded (red)
3. **Top Spending Categories** — Where the money went this week, with week-over-week comparison
4. **Subscription Activity** — Any renewals this week, upcoming renewals next week
5. **Goal Progress** — How each goal moved (or didn't) this week
6. **AI Insight** — A single paragraph from Claude analyzing the week's patterns and offering one actionable suggestion (e.g., "You spent 40% more on dining this week than your monthly average. If this continues, you'll exceed your dining budget by ~$120. Consider meal prepping this weekend.")

**Implementation approach:**
- Add a `/app/digest/page.tsx` page with the digest UI
- Create `/api/digest/generate` that:
  1. Fetches transactions for the current and previous week
  2. Fetches budget status, goal progress, and subscription data
  3. Computes summary statistics and comparisons
  4. Calls Claude with a focused prompt to generate the AI insight paragraph
  5. Returns the assembled digest
- Cache the digest in a `weekly_digests` table so it doesn't regenerate on every visit
- Add a "Digest" link in the main navigation between "Analytics" and "Budget"

### Part 3: AI-Powered Digest Enhancement (Stretch)

Leverage the existing AI assistant to make the digest conversational:
- After viewing the digest, show a contextual prompt like "Want to dive deeper into your dining spending this week?" that opens the AI assistant pre-loaded with the digest context
- The AI assistant's system prompt already includes financial context — extend it to include the latest digest summary so conversations are immediately relevant

## Why This Feature

1. **Leverages everything that already exists.** Every data source in Minti (Plaid transactions, budgets, goals, subscriptions, AI) feeds into this feature. No new external integrations needed.

2. **Increases engagement without increasing effort.** Users get value from Minti even when they don't actively seek it out. The alerts and digest give them a reason to open the app regularly.

3. **Differentiates from competitors.** Most personal finance apps show data. Few proactively interpret it and tell you what to *do*. The AI-powered insight paragraph is uniquely possible because Minti already has Claude integrated.

4. **Natural scope for iteration.** Start with in-app alerts only, then add the digest page, then add the AI enhancement. Each phase is independently valuable.

## Rough Implementation Plan

### Phase 1: Alert System (~3-4 components, 1 API route, 1 DB table)
- `supabase/migrations/add_alerts_table.sql`
- `app/api/alerts/generate/route.ts` — alert rule engine
- `app/api/alerts/route.ts` — GET (list), PATCH (mark read), DELETE (dismiss)
- `components/notification-bell.tsx` — header bell icon with badge
- `components/notification-panel.tsx` — dropdown listing alerts
- Update `components/dashboard-header.tsx` to include the bell

### Phase 2: Weekly Digest (~2-3 components, 1 API route, 1 DB table)
- `supabase/migrations/add_digests_table.sql`
- `app/api/digest/generate/route.ts` — digest assembly + AI insight
- `app/digest/page.tsx` — digest page with cards/sections
- `components/digest/` — section components (budget scorecard, spending summary, etc.)
- Update navigation to include Digest link

### Phase 3: AI Integration (modify existing)
- Update `lib/ai/financial-context.ts` to include latest digest data
- Add contextual AI prompts on the digest page
- Update `lib/ai/system-prompt.ts` with digest awareness

## Database Changes

```sql
-- Phase 1: Alerts
CREATE TABLE alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,        -- 'budget_warning', 'subscription_renewal', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',  -- 'low', 'medium', 'high'
  read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}',   -- contextual data (category, amount, goal_id, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own alerts"
  ON alerts FOR ALL USING (auth.uid() = user_id);

-- Phase 2: Cached digests
CREATE TABLE weekly_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  digest_data JSONB NOT NULL,    -- full computed digest
  ai_insight TEXT,               -- Claude's generated paragraph
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own digests"
  ON weekly_digests FOR ALL USING (auth.uid() = user_id);
```
