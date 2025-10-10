# OddsPulse Starter

A minimal Next.js starter for a Whop app MVP (alerts + hedge calculator).

## Quickstart
1. `cp .env.example .env.local` and fill values
2. `npm install`
3. `npm run dev`

## What’s included
- `/app` with Dashboard (`/`) and Settings (`/settings`)
- Whop OAuth callback route: `/api/whop/callback`
- Webhook endpoint: `/api/webhooks/whop`
- Minimal middleware for membership gate
- Stubs for Supabase + Whop API client

Replace mock alerts with your real data source when ready.
