# Minti - Personal Finance Dashboard

A beautiful, nature-inspired personal finance dashboard built with Next.js, featuring Plaid integration for real-time bank account data and Supabase authentication.

## Features

- **User Authentication** - Secure password-based authentication with Supabase
- **Bank Account Integration** - Connect your bank accounts via Plaid
- **Real-time Balance Tracking** - View your account balances in real-time
- **Transaction History** - See recent transactions from your connected accounts
- **Financial Overview** - Visualize income and spending trends
- **Studio Ghibli Theme** - Soft, nature-inspired design with pastel green colors

## Setup Guide

### Prerequisites

1. **Supabase Account**
   - Sign up at [https://supabase.com](https://supabase.com)
   - Create a new project
   - Get your API credentials from Project Settings > API

2. **Plaid Account** (Optional, for bank integration)
   - Sign up at [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
   - Get your API credentials from [Team Keys](https://dashboard.plaid.com/team/keys)

### Installation

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Then update `.env.local` with your credentials:
   ```env
   # Supabase (Required)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Plaid (Optional)
   PLAID_CLIENT_ID=your_client_id_here
   PLAID_SECRET=your_secret_here
   PLAID_ENV=sandbox
   ```

3. **Set up Supabase Authentication**

   In your Supabase project dashboard:
   - Go to Authentication > URL Configuration
   - Add `http://localhost:3000/auth/callback` to the Redirect URLs

4. **Start the development server**
   ```bash
   pnpm dev
   ```

5. **Open the app**

   Visit [http://localhost:3000](http://localhost:3000) and create an account!

## Usage

### Authentication

- **Sign Up**: Create a new account at `/signup`
- **Sign In**: Log in to your account at `/login`
- **Sign Out**: Click your avatar in the header and select "Log out"

### Connecting Bank Accounts

1. Once logged in, click "Connect Bank Account"
2. In sandbox mode, use test credentials: `user_good` / `pass_good`
3. Your account balances will appear automatically

## Tech Stack

- Next.js 16 (App Router)
- Supabase Auth
- Plaid
- Tailwind CSS
- shadcn/ui
- Recharts
