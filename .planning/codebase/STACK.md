# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- TypeScript 5.x - Used across all application code (`.ts`, `.tsx` files)
- JavaScript (TSX/JSX) - React components with TypeScript

**Secondary:**
- CSS - Via Tailwind CSS with custom animations
- Markdown - Content and documentation

## Runtime

**Environment:**
- Node.js - Server runtime for Next.js
- Browsers - Client-side React execution
- Edge Runtime - Vercel edge functions capable (configured for `maxDuration = 30` in API routes)

**Package Manager:**
- pnpm - Primary package manager (indicated by `pnpm-lock.yaml`)
- npm - Secondary option (package-lock.json present)
- Lockfiles: Both `pnpm-lock.yaml` and `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.0.0 - Full-stack React framework with API routes and SSR
- React 19.2.0 - UI library
- React DOM 19.2.0 - DOM rendering for React

**UI Components:**
- Radix UI - Headless component library (full suite of 28+ primitives)
  - `@radix-ui/react-*` (v1.1.x to v2.1.x)
- shadcn/ui - Tailwind-based component library referenced via `components.json`
- Lucide React 0.454.0 - Icon library

**Forms & Validation:**
- React Hook Form 7.60.0 - Form state management
- `@hookform/resolvers` 3.10.0 - Validation resolver integration
- Zod 3.25.76 - Schema validation and type inference

**Styling:**
- Tailwind CSS 4.1.9 - Utility-first CSS framework
- `tailwindcss-animate` 1.0.7 - Animation utilities
- `tailwind-merge` 3.3.1 - Class name merging utility
- PostCSS 8.5 - CSS processing
- Autoprefixer 10.4.20 - Vendor prefixing

**UI Utilities:**
- `class-variance-authority` 0.7.1 - Variant composition
- `clsx` 2.1.1 - Conditional class merging
- `cmdk` 1.0.4 - Command menu component
- `sonner` 1.7.4 - Toast notifications

**Data Display:**
- Recharts 2.15.4 - Charts and graphs
- Date-fns 4.1.0 - Date manipulation
- React Markdown 10.1.0 - Markdown rendering
- Embla Carousel React 8.5.1 - Carousel component
- React Resizable Panels 2.1.7 - Draggable panel layouts

**Form Utilities:**
- React Day Picker 9.8.0 - Date picker component
- Input OTP 1.4.1 - OTP input component
- Vaul 0.9.9 - Drawer component

**Testing:**
- Not detected in dependencies (no Jest, Vitest, Playwright, etc.)

**Build/Dev:**
- TypeScript 5.x - Language compiler
- `@types/node` 22.x - Node.js type definitions
- `@types/react` 19.x - React type definitions
- `@types/react-dom` 19.x - React DOM type definitions
- ESLint - Code linting
- `tw-animate-css` 1.3.3 - CSS animation utilities
- `@tailwindcss/postcss` 4.1.9 - Modern Tailwind PostCSS plugin

## Key Dependencies

**Critical:**
- `@ai-sdk/anthropic` 3.0.16 - Anthropic Claude AI integration
- `@ai-sdk/react` 3.0.44 - React SDK for Vercel AI SDK
- `ai` 6.0.42 - Vercel AI SDK for streaming text responses
- `@supabase/supabase-js` 2.84.0 - Supabase client for PostgreSQL database
- `@supabase/ssr` 0.7.0 - Server-side auth/SSR support for Supabase

**Financial Data:**
- `plaid` 39.1.0 - Plaid API client SDK
- `react-plaid-link` 4.1.1 - React wrapper for Plaid Link modal

**Monitoring:**
- `@vercel/analytics` 1.3.1 - Vercel Web Analytics integration

**Theme Management:**
- `next-themes` 0.4.6 - Dark mode theme provider

## Configuration

**Environment:**
- `.env.local` - Local environment variables (not committed)
- `.env.local.example` - Template for environment variables
- Configured variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
  - `NEXT_PUBLIC_SITE_URL` - Frontend URL for redirects
  - `PLAID_CLIENT_ID` - Plaid API client ID
  - `PLAID_SECRET` - Plaid API secret key
  - `PLAID_ENV` - Plaid environment (sandbox, development, production)
  - `PLAID_ACCESS_TOKEN` - Stored access token (database stored in production)
  - `ANTHROPIC_API_KEY` - Anthropic/Claude API key (server-side only)

**Build:**
- `next.config.ts` - Next.js configuration (minimal, defaults used)
- `tsconfig.json` - TypeScript compiler options
  - Target: ES2017
  - Module: ESNext
  - JSX: react-jsx
  - Path alias: `@/*` → current directory
  - Strict mode enabled
- `postcss.config.mjs` - PostCSS configuration
- `eslint.config.mjs` - ESLint configuration
  - Extends `eslint-config-next/core-web-vitals`
  - Extends `eslint-config-next/typescript`
- `components.json` - shadcn/ui component configuration

## Platform Requirements

**Development:**
- Node.js runtime (type definitions for v22.x)
- npm or pnpm for package management
- No specific Node version lock file (`.nvmrc` or `.node-version`)

**Production:**
- Vercel deployment platform (implied by Next.js 16 and `@vercel/analytics`)
- Edge runtime capable infrastructure for streaming responses
- Environment variables must be configured in deployment platform

---

*Stack analysis: 2026-01-22*
