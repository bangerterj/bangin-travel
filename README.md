# Bangin' Travel

A collaborative trip planner app built with Next.js.

## Features
- Create trips and share access via passcode.
- Add travelers, flights, stays, transit, and activities.
- Real-time collaboration (persistent data).
- Mobile-friendly UI.

## Local Development

### Prerequisites
1.  Node.js installed.
2.  A Postgres database (local or hosted like Supabase, Neon, Vercel Postgres).

### Setup
1.  Clone the repo.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy `.env.local.example` to `.env.local` and fill in your values:
    ```bash
    cp .env.local.example .env.local
    ```
    -   `POSTGRES_URL`: Connection string to your Postgres DB.
    -   `JWT_SECRET`: Random string for signing tokens.

4.  Run the development server:
    ```bash
    npm run dev
    ```
    The database schema will be automatically created on the first run.

## Deployment on Vercel

1.  Push the code to GitHub.
2.  Import the project in Vercel.
3.  Set the Environment Variables in Vercel Project Settings:
    -   `POSTGRES_URL`
    -   `JWT_SECRET`
4.  Deploy!

## Database
Uses `pg` (node-postgres) to connect to a PostgreSQL database. 
-   Schema is auto-migrated on app startup if tables don't exist.
-   No default seed data is included.
