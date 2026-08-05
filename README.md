# eSIM Analytics Dashboard

A lightweight analytics dashboard for monitoring eSIM sales performance. The project presents key business metrics, a sales leaderboard, destination insights, and trend charts in a modern dark-themed interface.

## Overview

This prototype is built as a static web app that connects to a Supabase-backed RPC endpoint and renders sales data for a selected report date. It is designed for internal business reporting and quick KPI monitoring.

## What the dashboard shows

- KPI cards for:
  - Today’s sales and revenue
  - Month-to-date (MTD) sales and revenue
  - Previous month same day comparison
  - Previous month totals
- A daily leaderboard of sales representatives
- Top destination performance
- Two visual analytics charts:
  - Daily summary
  - Monthly summary
- A wallet summary modal with revenue and sales totals
- CSV export action for the current view

## Tech stack

- HTML5 for structure
- CSS3 for styling and layout
- Vanilla JavaScript for rendering and data interaction
- Chart.js for charts
- Supabase REST/RPC for data retrieval
- PostgreSQL SQL scripts for schema and dashboard query definitions

## Project structure

- index.html — dashboard layout and UI structure
- styles.css — visual styling, layout, cards, tables, charts, and modal UI
- script.js — data fetching, rendering logic, charts, counters, and modal behavior
- queries.sql — SQL schema and dashboard query examples for PostgreSQL/Supabase
- .env.example — example environment variables for a Supabase configuration

## Data source

The dashboard calls a Supabase RPC endpoint to fetch dashboard data for a selected report date. The SQL logic used by the backend is defined in queries.sql and includes:

- table definitions for orders, users, products, and destinations
- sample insert data
- a dashboard function that returns:
  - daily_metrics
  - monthly_metrics
  - kpi_cards
  - leaderboard_metrics

## How to run locally

Because this is a static frontend, you can run it directly in a browser.

### Option 1: Open directly

- Open index.html in your browser.

### Option 2: Use a simple local server

If you prefer a local development server, run one of the following from the project folder:

- Python:
  - python -m http.server 8000
- Node.js (if available):
  - npx serve .

Then open http://localhost:8000 in your browser.

## Notes

- The dashboard currently uses a hard-coded Supabase endpoint and key inside script.js.
- The project is a prototype and may need backend/API adjustments depending on your Supabase setup.
- Some UI elements rely on remote resources such as Google Fonts and Chart.js CDN, so an internet connection is needed for full appearance and chart rendering.

## Deployment

The project is suitable for deployment as a static site. Vercel is a natural fit because the workspace includes a Vercel configuration directory.

## Future improvements

Possible enhancements include:

- moving Supabase credentials to environment variables
- adding real filters for date range and sales rep
- improving empty/error states
- adding export of leaderboard and destination summaries
- connecting the app to a production backend with authentication
