# Plaid Integration Setup Guide

This guide will help you set up Plaid integration to display real bank account balances.

## Prerequisites

1. Create a Plaid account at [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
2. Get your API credentials from [https://dashboard.plaid.com/team/keys](https://dashboard.plaid.com/team/keys)

## Setup Steps

### 1. Configure Environment Variables

Create a `.env.local` file in the root of your project:

```bash
cp .env.local.example .env.local
```

Then update the file with your Plaid credentials:

```env
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_sandbox_secret_here
PLAID_ENV=sandbox
```

### 2. Start the Development Server

```bash
pnpm dev
```

### 3. Test the Integration

1. Open your app at [http://localhost:3000](http://localhost:3000)
2. Click the "Connect Bank Account" button
3. In the Plaid Link interface, select any bank (in sandbox mode)
4. Use the test credentials:
   - Username: `user_good`
   - Password: `pass_good`
5. Select the accounts you want to connect
6. Your real-time balance should now be displayed!

## How It Works

### Components

- **[plaid-link.tsx](components/plaid-link.tsx)** - Handles the Plaid Link flow to connect bank accounts
- **[accounts-overview.tsx](components/accounts-overview.tsx)** - Displays account balances fetched from Plaid

### API Routes

- **[/api/plaid/create-link-token/route.ts](app/api/plaid/create-link-token/route.ts)** - Creates a link token for Plaid Link
- **[/api/plaid/exchange-public-token/route.ts](app/api/plaid/exchange-public-token/route.ts)** - Exchanges public token for access token
- **[/api/plaid/balance/route.ts](app/api/plaid/balance/route.ts)** - Fetches account balances

### Configuration

- **[lib/plaid.ts](lib/plaid.ts)** - Plaid client configuration

## Important Notes

### Security Warning

**The current implementation stores the access token in localStorage, which is NOT recommended for production use.**

For production, you should:
1. Store access tokens securely in a database
2. Implement user authentication
3. Associate access tokens with specific users
4. Use environment-specific secrets
5. Never expose access tokens to the client

### Sandbox vs Production

- **Sandbox**: Use for testing with fake data
- **Production**: Requires Plaid approval and uses real bank data

To switch to production:
1. Get production credentials from Plaid
2. Update `PLAID_ENV=production` in `.env.local`
3. Implement proper security measures (database, authentication, etc.)

## Troubleshooting

### Error: "Failed to create link token"
- Check that your `PLAID_CLIENT_ID` and `PLAID_SECRET` are correct
- Verify that your environment variables are loaded (restart dev server after changes)

### Error: "Failed to fetch balance"
- Ensure you've successfully connected a bank account
- Check the browser console for detailed error messages

### No accounts showing
- Make sure you completed the Plaid Link flow
- Check that the access token is stored in localStorage
- Open browser DevTools > Application > Local Storage to verify

## Next Steps

Consider implementing:
- Transaction history display
- Account filtering
- Refresh balance button
- Multiple account connections
- User authentication and secure token storage
- Database integration (PostgreSQL, MongoDB, etc.)
